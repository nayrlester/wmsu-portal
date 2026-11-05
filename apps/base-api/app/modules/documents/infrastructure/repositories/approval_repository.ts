import { DateTime } from 'luxon'
import Approval from '#modules/documents/models/approval'
import { tenantContext } from '#modules/documents/domain/tenant_context'

export class ApprovalRepository {
  async create(data: {
    tenantId: string
    documentId: string
    workflowInstanceId: string | null
    approverId: string
    action: string
    comments: string | null
    stepNodeId: string | null
  }): Promise<Approval> {
    return Approval.create({
      ...data,
      actedAt: DateTime.now(),
    })
  }

  async listByDocument(documentId: string): Promise<Approval[]> {
    const tenantId = tenantContext.requireTenantId()
    return this.listByDocumentForTenant(documentId, tenantId)
  }

  async listByDocumentForTenant(documentId: string, tenantId: string): Promise<Approval[]> {
    return Approval.query()
      .where('tenant_id', tenantId)
      .where('document_id', documentId)
      .whereNull('deleted_at')
      .preload('approver')
      .orderBy('acted_at', 'desc')
  }

  async hasApprovedStep(
    documentId: string,
    workflowInstanceId: string,
    stepNodeId: string,
    approverId: string
  ): Promise<boolean> {
    const existing = await Approval.query()
      .where('document_id', documentId)
      .where('workflow_instance_id', workflowInstanceId)
      .where('step_node_id', stepNodeId)
      .where('approver_id', approverId)
      .where('action', 'approve')
      .whereNull('deleted_at')
      .first()

    return Boolean(existing)
  }
}

export const approvalRepository = new ApprovalRepository()
