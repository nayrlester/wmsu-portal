import Document from '#modules/documents/models/document'
import DocumentVersion from '#modules/documents/models/document_version'
import type { WorkflowGraph } from '#modules/documents/domain/workflows/workflow_graph'
import { NotificationTrigger } from '#modules/documents/domain/notifications/notification_types'
import { notificationDispatcherService } from '#modules/documents/services/notification_dispatcher_service'
import { routingRepository } from '#infrastructure/repositories/routing_repository'
import { approvalRepository } from '#infrastructure/repositories/approval_repository'

export class DocumentNotificationService {
  /**
   * Resolves users involved in a document's lifecycle: creator, assignee,
   * prior routing actors, prior approvers, and version submitters.
   */
  async resolveStakeholderUserIds(
    documentId: string,
    tenantId: string,
    excludeUserId?: string | null
  ): Promise<string[]> {
    const document = await Document.query()
      .where('id', documentId)
      .where('tenant_id', tenantId)
      .first()

    if (!document) return []

    const ids = new Set<string>()

    if (document.createdById) ids.add(document.createdById)
    if (document.assignedToId) ids.add(document.assignedToId)

    const routingEntries = await routingRepository.listByDocumentForTenant(documentId, tenantId)
    for (const entry of routingEntries) {
      if (entry.fromUserId) ids.add(entry.fromUserId)
      if (entry.toUserId) ids.add(entry.toUserId)
    }

    const approvals = await approvalRepository.listByDocumentForTenant(documentId, tenantId)
    for (const approval of approvals) {
      if (approval.approverId) ids.add(approval.approverId)
    }

    const submittedVersions = await DocumentVersion.query()
      .where('tenant_id', tenantId)
      .where('document_id', documentId)
      .whereNotNull('submitted_at')
      .select('created_by_id')

    for (const version of submittedVersions) {
      if (version.createdById) ids.add(version.createdById)
    }

    if (excludeUserId) ids.delete(excludeUserId)

    return [...ids]
  }

  async notifyWorkflowStepAssignees(
    document: Document,
    graph: WorkflowGraph,
    activeNodeIds: string[]
  ): Promise<void> {
    const recipientIds = new Set<string>()
    const roleIds = new Set<string>()

    for (const nodeId of activeNodeIds) {
      const node = graph.getNode(nodeId)
      if (!node?.assignee) continue

      if (node.assignee.userId) {
        recipientIds.add(node.assignee.userId)
      }

      if (node.assignee.roleId) {
        roleIds.add(node.assignee.roleId)
      }
    }

    await Promise.all(
      [...roleIds].map(async (roleId) => {
        const roleUsers = await notificationDispatcherService.resolveUserIdsByRole(
          document.tenantId,
          roleId
        )
        roleUsers.forEach((id) => recipientIds.add(id))
      })
    )

    if (recipientIds.size > 0) {
      await notificationDispatcherService.dispatch({
        tenantId: document.tenantId,
        documentId: document.id,
        trigger: NotificationTrigger.ASSIGNED,
        recipientUserIds: [...recipientIds],
        title: `Document assigned: ${document.title}`,
        body: `Document ${document.trackingNumber} requires your review.`,
        data: {
          documentId: document.id,
          trackingNumber: document.trackingNumber,
        },
      })
    }

    const { executeWorkflowStepActions } = await import('#modules/documents/services/workflow_step_actions_service')
    for (const nodeId of activeNodeIds) {
      const node = graph.getNode(nodeId)
      if (!node) continue
      await executeWorkflowStepActions({
        document,
        node,
        recipientUserIds: [...recipientIds],
      })
    }
  }
}

export const documentNotificationService = new DocumentNotificationService()
