import type { WorkflowDefinition } from '#modules/documents/domain/workflows/workflow_types'
import { workflowDefinitionValidator } from '#modules/documents/domain/workflows/workflow_definition_validator'
import { buildWorkflowGraph } from '#modules/documents/domain/workflows/workflow_graph'
import { WorkflowPolicy } from '#modules/documents/domain/workflows/workflow_policy'
import { WorkflowStatus, AuditAction } from '#modules/documents/domain/enums/index'
import { workflowRepository } from '#infrastructure/repositories/workflow_repository'
import { tenantContext } from '#modules/documents/domain/tenant_context'
import { auditService } from '#modules/documents/services/audit_service'
import { planLimitService } from '#modules/documents/services/plan_limit_service'
import { DateTime } from 'luxon'
import type Workflow from '#modules/documents/models/workflow'
import { InvalidWorkflowStateException } from '#modules/documents/domain/workflows/workflow_exceptions'

export interface CreateWorkflowInput {
  name: string
  description?: string | null
  definition: unknown
}

export interface UpdateWorkflowInput {
  name?: string
  description?: string | null
  definition?: unknown
}

export class WorkflowService {
  async list(filters: Parameters<typeof workflowRepository.paginate>[0]) {
    return workflowRepository.paginate(filters)
  }

  async findById(id: string): Promise<Workflow> {
    return workflowRepository.findByIdOrFail(id)
  }

  async create(input: CreateWorkflowInput, userId: string): Promise<Workflow> {
    const tenantId = tenantContext.requireTenantId()
    await planLimitService.assertCanCreateWorkflow(tenantId)

    const definition = workflowDefinitionValidator.validate(input.definition)

    const workflow = await workflowRepository.create({
      tenantId,
      name: input.name,
      description: input.description ?? null,
      definition,
      createdById: userId,
    })

    await this.syncStepsFromDefinition(workflow.id, definition)

    await auditService.log({
      tenantId,
      userId,
      action: AuditAction.CREATE,
      entityType: 'workflow',
      entityId: workflow.id,
      newValues: { name: workflow.name, status: workflow.status },
    })

    return workflowRepository.findByIdOrFail(workflow.id)
  }

  async update(workflowId: string, input: UpdateWorkflowInput, userId: string): Promise<Workflow> {
    const workflow = await workflowRepository.findByIdOrFail(workflowId)
    WorkflowPolicy.assertCanUpdate(workflow.status)

    const oldValues = {
      name: workflow.name,
      description: workflow.description,
    }

    if (input.name !== undefined) workflow.name = input.name
    if (input.description !== undefined) workflow.description = input.description

    if (input.definition !== undefined) {
      const definition = workflowDefinitionValidator.validate(input.definition)
      workflow.definition = definition as unknown as Record<string, unknown>
      await this.syncStepsFromDefinition(workflow.id, definition)
    }

    await workflowRepository.save(workflow)

    await auditService.log({
      tenantId: workflow.tenantId,
      userId,
      action: AuditAction.UPDATE,
      entityType: 'workflow',
      entityId: workflow.id,
      oldValues,
      newValues: input as Record<string, unknown>,
    })

    return workflowRepository.findByIdOrFail(workflow.id)
  }

  async delete(workflowId: string, userId: string): Promise<void> {
    const workflow = await workflowRepository.findByIdOrFail(workflowId)
    WorkflowPolicy.assertCanDelete(workflow.status)

    await workflowRepository.softDelete(workflow)

    await auditService.log({
      tenantId: workflow.tenantId,
      userId,
      action: AuditAction.DELETE,
      entityType: 'workflow',
      entityId: workflow.id,
      oldValues: { name: workflow.name },
    })
  }

  async publish(workflowId: string, userId: string): Promise<Workflow> {
    const workflow = await workflowRepository.findByIdOrFail(workflowId)
    WorkflowPolicy.assertCanPublish(workflow.status)

    const definition = workflowDefinitionValidator.validate(workflow.definition)
    await this.syncStepsFromDefinition(workflow.id, definition)

    workflow.status = WorkflowStatus.PUBLISHED
    workflow.publishedAt = DateTime.now()
    workflow.version = workflow.version + 1
    workflow.definition = definition as unknown as Record<string, unknown>

    await workflowRepository.save(workflow)

    await auditService.log({
      tenantId: workflow.tenantId,
      userId,
      action: AuditAction.UPDATE,
      entityType: 'workflow',
      entityId: workflow.id,
      metadata: { action: 'publish', version: workflow.version },
    })

    return workflowRepository.findByIdOrFail(workflow.id)
  }

  async archive(workflowId: string, userId: string): Promise<Workflow> {
    const workflow = await workflowRepository.findByIdOrFail(workflowId)

    if (workflow.status === WorkflowStatus.ARCHIVED) {
      throw new InvalidWorkflowStateException('Workflow is already archived')
    }

    workflow.status = WorkflowStatus.ARCHIVED
    await workflowRepository.save(workflow)

    await auditService.log({
      tenantId: workflow.tenantId,
      userId,
      action: AuditAction.UPDATE,
      entityType: 'workflow',
      entityId: workflow.id,
      metadata: { action: 'archive' },
    })

    return workflowRepository.findByIdOrFail(workflow.id)
  }

  async simulate(
    workflowId: string,
    input: {
      priority?: string
      departmentId?: string | null
      documentTypeId?: string | null
      metadata?: Record<string, unknown> | null
    }
  ) {
    const workflow = await workflowRepository.findByIdOrFail(workflowId)
    const definition = workflow.definition as unknown as WorkflowDefinition
    const { simulateWorkflowDefinition } = await import('#modules/documents/domain/workflows/workflow_simulate')
    return {
      workflowId: workflow.id,
      workflowName: workflow.name,
      status: workflow.status,
      simulation: simulateWorkflowDefinition(definition, input),
    }
  }

  private async syncStepsFromDefinition(workflowId: string, definition: WorkflowDefinition): Promise<void> {
    const graph = buildWorkflowGraph(definition)
    await workflowRepository.replaceSteps(workflowId, graph.toStepRecords())
  }
}

export const workflowService = new WorkflowService()
