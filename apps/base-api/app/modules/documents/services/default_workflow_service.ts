import { DateTime } from 'luxon'
import Workflow from '#modules/documents/models/workflow'
import DocumentType from '#modules/documents/models/document_type'
import Role from '#modules/documents/models/role'
import { DefaultRoleSlug, WorkflowStatus } from '#modules/documents/domain/enums/index'
import {
  WORKFLOW_DEFINITION_SCHEMA_VERSION,
  type WorkflowDefinition,
} from '#modules/documents/domain/workflows/workflow_types'
import { workflowDefinitionValidator } from '#modules/documents/domain/workflows/workflow_definition_validator'
import { buildWorkflowGraph } from '#modules/documents/domain/workflows/workflow_graph'
import WorkflowStep from '#modules/documents/models/workflow_step'

async function replaceWorkflowSteps(
  workflowId: string,
  steps: Array<{
    nodeId: string
    name: string
    stepType: string
    orderIndex: number
    assigneeRoleId: string | null
    assigneeUserId: string | null
    assigneeDepartmentId: string | null
    conditions: Record<string, unknown> | null
    slaHours: number | null
  }>
): Promise<void> {
  await WorkflowStep.query().where('workflow_id', workflowId).delete()
  if (steps.length === 0) return
  await WorkflowStep.createMany(
    steps.map((step) => ({
      workflowId,
      nodeId: step.nodeId,
      name: step.name,
      stepType: step.stepType,
      orderIndex: step.orderIndex,
      assigneeRoleId: step.assigneeRoleId,
      assigneeUserId: step.assigneeUserId,
      assigneeDepartmentId: step.assigneeDepartmentId,
      conditions: step.conditions,
      slaHours: step.slaHours,
    }))
  )
}

export function buildDefaultWorkflowDefinition(approverRoleId: string): WorkflowDefinition {
  return {
    schemaVersion: WORKFLOW_DEFINITION_SCHEMA_VERSION,
    entryNodeId: 'review',
    nodes: [
      { id: 'start', name: 'Start', type: 'start', position: { x: 0, y: 0 } },
      {
        id: 'review',
        name: 'Review',
        type: 'sequential',
        assignee: { roleId: approverRoleId },
        position: { x: 120, y: 0 },
      },
      { id: 'end', name: 'End', type: 'end', position: { x: 240, y: 0 } },
    ],
    edges: [
      { id: 'e1', source: 'start', target: 'review' },
      { id: 'e2', source: 'review', target: 'end' },
    ],
  }
}

export class DefaultWorkflowService {
  /** Idempotent — ensures every tenant has a published default approval workflow. */
  async provisionForTenant(
    tenantId: string,
    approverRoleId: string,
    createdByUserId: string
  ): Promise<Workflow> {
    const existing = await Workflow.query()
      .where('tenant_id', tenantId)
      .where('status', WorkflowStatus.PUBLISHED)
      .whereNull('deleted_at')
      .orderBy('published_at', 'desc')
      .first()

    if (existing) {
      await this.linkDocumentTypes(tenantId, existing.id)
      await this.repairDefaultWorkflowAssignee(tenantId, approverRoleId)
      return existing
    }

    const definition = workflowDefinitionValidator.validate(
      buildDefaultWorkflowDefinition(approverRoleId)
    )

    const workflow = await Workflow.create({
      tenantId,
      name: 'Default Approval Flow',
      description: 'Standard document review and approval',
      status: WorkflowStatus.PUBLISHED,
      version: 1,
      definition: definition as unknown as Record<string, unknown>,
      createdById: createdByUserId,
      publishedAt: DateTime.now(),
    })

    const graph = buildWorkflowGraph(definition)
    await replaceWorkflowSteps(workflow.id, graph.toStepRecords())
    await this.linkDocumentTypes(tenantId, workflow.id)

    return workflow
  }

  async resolveApproverRoleId(tenantId: string): Promise<string> {
    const approverRole = await Role.query()
      .where('tenant_id', tenantId)
      .where('slug', DefaultRoleSlug.APPROVER)
      .first()

    if (approverRole) return approverRole.id

    const ownerRole = await Role.query()
      .where('tenant_id', tenantId)
      .where('slug', DefaultRoleSlug.TENANT_OWNER)
      .firstOrFail()

    return ownerRole.id
  }

  /** Idempotent — ensures tenant has a published workflow before document routing. */
  async ensureWorkflowReady(tenantId: string, actorUserId: string): Promise<Workflow> {
    const approverRoleId = await this.resolveApproverRoleId(tenantId)
    const workflow = await this.provisionForTenant(tenantId, approverRoleId, actorUserId)
    await this.repairDefaultWorkflowAssignee(tenantId, approverRoleId)
    return workflow
  }

  /** Updates legacy default workflows that still assign review to tenant owner instead of approver. */
  async repairDefaultWorkflowAssignee(tenantId: string, approverRoleId: string): Promise<void> {
    const workflow = await Workflow.query()
      .where('tenant_id', tenantId)
      .where('name', 'Default Approval Flow')
      .where('status', WorkflowStatus.PUBLISHED)
      .whereNull('deleted_at')
      .first()

    if (!workflow) return

    const definition = workflow.definition as unknown as WorkflowDefinition
    const reviewNode = definition.nodes.find((node) => node.id === 'review')
    if (!reviewNode || reviewNode.assignee?.roleId === approverRoleId) return

    reviewNode.assignee = { roleId: approverRoleId }
    const validated = workflowDefinitionValidator.validate(definition)
    workflow.definition = validated as unknown as Record<string, unknown>
    await workflow.save()

    const graph = buildWorkflowGraph(validated)
    await replaceWorkflowSteps(workflow.id, graph.toStepRecords())
  }

  private async linkDocumentTypes(tenantId: string, workflowId: string): Promise<void> {
    await DocumentType.query()
      .where('tenant_id', tenantId)
      .whereNull('default_workflow_id')
      .update({ defaultWorkflowId: workflowId })
  }
}

export const defaultWorkflowService = new DefaultWorkflowService()
