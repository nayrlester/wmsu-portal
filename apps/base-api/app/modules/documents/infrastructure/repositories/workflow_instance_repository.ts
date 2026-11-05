import { DateTime } from 'luxon'
import DocumentWorkflowInstance from '#modules/documents/models/document_workflow_instance'
import type { WorkflowInstanceState } from '#modules/documents/domain/workflows/workflow_types'
import { tenantContext } from '#modules/documents/domain/tenant_context'
import { WorkflowInstanceNotFoundException } from '#modules/documents/domain/workflows/workflow_exceptions'

export class WorkflowInstanceRepository {
  async findActiveByDocument(documentId: string): Promise<DocumentWorkflowInstance | null> {
    const instances = await this.findAllActiveByDocument(documentId)
    return instances[0] ?? null
  }

  async findAllActiveByDocument(documentId: string): Promise<DocumentWorkflowInstance[]> {
    const tenantId = tenantContext.requireTenantId()
    return DocumentWorkflowInstance.query()
      .where('tenant_id', tenantId)
      .where('document_id', documentId)
      .where('status', 'active')
      .preload('workflow', (query) => query.preload('steps'))
      .orderBy('started_at', 'desc')
  }

  async findActiveByVersion(
    documentId: string,
    versionId: string
  ): Promise<DocumentWorkflowInstance | null> {
    const tenantId = tenantContext.requireTenantId()
    return DocumentWorkflowInstance.query()
      .where('tenant_id', tenantId)
      .where('document_id', documentId)
      .where('version_id', versionId)
      .where('status', 'active')
      .preload('workflow', (query) => query.preload('steps'))
      .first()
  }

  async findByIdOrFail(id: string): Promise<DocumentWorkflowInstance> {
    const tenantId = tenantContext.requireTenantId()
    const instance = await DocumentWorkflowInstance.query()
      .where('tenant_id', tenantId)
      .where('id', id)
      .preload('workflow', (query) => query.preload('steps'))
      .first()

    if (!instance) {
      throw new WorkflowInstanceNotFoundException()
    }

    return instance
  }

  async create(data: {
    tenantId: string
    documentId: string
    workflowId: string
    versionId?: string | null
    currentNodeId: string
    state: WorkflowInstanceState
  }): Promise<DocumentWorkflowInstance> {
    return DocumentWorkflowInstance.create({
      tenantId: data.tenantId,
      documentId: data.documentId,
      versionId: data.versionId ?? null,
      workflowId: data.workflowId,
      status: 'active',
      currentNodeId: data.currentNodeId,
      state: data.state,
      startedAt: DateTime.now(),
    })
  }

  async save(instance: DocumentWorkflowInstance): Promise<void> {
    await instance.save()
  }

  async complete(instance: DocumentWorkflowInstance): Promise<void> {
    instance.status = 'completed'
    instance.completedAt = DateTime.now()
    instance.currentNodeId = null
    instance.state = {
      ...(instance.state ?? { activeNodeIds: [], completedNodeIds: [], parallelGroups: {}, history: [] }),
      activeNodeIds: [],
    }
    await instance.save()
  }

  async cancel(instance: DocumentWorkflowInstance, reason: string): Promise<void> {
    instance.status = 'cancelled'
    instance.completedAt = DateTime.now()
    instance.currentNodeId = null
    if (instance.state) {
      instance.state.history.push({
        nodeId: instance.currentNodeId ?? 'system',
        action: reason,
        userId: 'system',
        at: DateTime.now().toISO(),
      })
    }
    await instance.save()
  }
}

export const workflowInstanceRepository = new WorkflowInstanceRepository()
