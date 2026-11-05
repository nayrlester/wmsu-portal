import { DateTime } from 'luxon'
import Workflow from '#modules/documents/models/workflow'
import WorkflowStep from '#modules/documents/models/workflow_step'
import type { WorkflowDefinition } from '#modules/documents/domain/workflows/workflow_types'
import { tenantContext } from '#modules/documents/domain/tenant_context'
import { WorkflowNotFoundException } from '#modules/documents/domain/workflows/workflow_exceptions'
import { WorkflowStatus } from '#modules/documents/domain/enums/index'

export interface WorkflowListFilters {
  page?: number
  limit?: number
  status?: string
  search?: string
}

export class WorkflowRepository {
  private baseQuery() {
    const tenantId = tenantContext.requireTenantId()
    return Workflow.query().where('tenant_id', tenantId).whereNull('deleted_at')
  }

  async paginate(filters: WorkflowListFilters) {
    const page = filters.page ?? 1
    const limit = Math.min(filters.limit ?? 20, 100)

    const query = this.baseQuery()
      .preload('steps')
      .preload('createdBy')
      .orderBy('updated_at', 'desc')

    if (filters.status) {
      query.where('status', filters.status)
    }

    if (filters.search) {
      query.where((builder) => {
        builder.whereILike('name', `%${filters.search}%`).orWhereILike('description', `%${filters.search}%`)
      })
    }

    return query.paginate(page, limit)
  }

  async findByIdOrFail(id: string): Promise<Workflow> {
    const workflow = await this.baseQuery()
      .where('id', id)
      .preload('steps', (query) => query.orderBy('order_index', 'asc'))
      .preload('createdBy')
      .first()

    if (!workflow) {
      throw new WorkflowNotFoundException()
    }

    return workflow
  }

  async findPublishedById(id: string): Promise<Workflow | null> {
    return this.baseQuery()
      .where('id', id)
      .where('status', WorkflowStatus.PUBLISHED)
      .preload('steps', (query) => query.orderBy('order_index', 'asc'))
      .first()
  }

  async findFirstPublishedForTenant(tenantId: string): Promise<Workflow | null> {
    return Workflow.query()
      .where('tenant_id', tenantId)
      .where('status', WorkflowStatus.PUBLISHED)
      .whereNull('deleted_at')
      .orderBy('published_at', 'desc')
      .first()
  }

  async countAll(): Promise<number> {
    const result = await this.baseQuery().count('* as total')
    return Number(result[0]?.$extras.total ?? 0)
  }

  async create(data: {
    tenantId: string
    name: string
    description: string | null
    definition: WorkflowDefinition
    createdById: string
  }): Promise<Workflow> {
    return Workflow.create({
      tenantId: data.tenantId,
      name: data.name,
      description: data.description,
      status: WorkflowStatus.DRAFT,
      version: 1,
      definition: data.definition as unknown as Record<string, unknown>,
      createdById: data.createdById,
    })
  }

  async save(workflow: Workflow): Promise<void> {
    await workflow.save()
  }

  async softDelete(workflow: Workflow): Promise<void> {
    workflow.deletedAt = DateTime.now()
    await workflow.save()
  }

  async replaceSteps(
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
}

export const workflowRepository = new WorkflowRepository()
