import type { DocumentActionEventPayload } from '#modules/documents/domain/routing/routing_types'
import { mapApprovalActionToAuditAction } from '#modules/documents/services/approval_service'
import { auditService } from '#modules/documents/services/audit_service'
import { ApprovalAction } from '#modules/documents/domain/enums/index'

export default class AuditDocumentActionListener {
  async handle(payload: DocumentActionEventPayload): Promise<void> {
    const auditAction = Object.values(ApprovalAction).includes(payload.action as ApprovalAction)
      ? mapApprovalActionToAuditAction(payload.action as ApprovalAction)
      : payload.action

    await auditService.log({
      tenantId: payload.tenantId,
      userId: payload.actorUserId,
      action: auditAction,
      entityType: 'document',
      entityId: payload.documentId,
      metadata: {
        routingAction: payload.action,
        stepNodeId: payload.stepNodeId ?? null,
        workflowInstanceId: payload.workflowInstanceId ?? null,
        fromUserId: payload.fromUserId ?? null,
        toUserId: payload.toUserId ?? null,
        remarks: payload.remarks ?? null,
        ...(payload.metadata ?? {}),
      },
    })
  }
}
