import Document from '#modules/documents/models/document'
import { ApprovalAction } from '#modules/documents/domain/enums/index'
import type { DocumentActionEventPayload } from '#modules/documents/domain/routing/routing_types'
import { DocumentNotificationAction } from '#modules/documents/domain/notifications/document_notification_actions'
import { NotificationTrigger } from '#modules/documents/domain/notifications/notification_types'
import { notificationDispatcherService } from '#modules/documents/services/notification_dispatcher_service'
import { documentNotificationService } from '#modules/documents/services/document_notification_service'

type ActionMapping = {
  trigger: NotificationTrigger
  title: (document: Document, payload: DocumentActionEventPayload) => string
  body: (document: Document, payload: DocumentActionEventPayload) => string
}

export default class NotificationDocumentActionListener {
  async handle(payload: DocumentActionEventPayload): Promise<void> {
    const document = await Document.query()
      .where('id', payload.documentId)
      .where('tenant_id', payload.tenantId)
      .first()

    if (!document) return

    const mapping = this.mapActionToTrigger(payload.action, payload)
    if (!mapping) return

    const recipientUserIds = await this.resolveRecipients(payload, document, mapping.trigger)
    if (recipientUserIds.length === 0) return

    await notificationDispatcherService.dispatch({
      tenantId: payload.tenantId,
      documentId: document.id,
      trigger: mapping.trigger,
      recipientUserIds,
      title: mapping.title(document, payload),
      body: payload.remarks ?? mapping.body(document, payload),
      data: {
        documentId: document.id,
        trackingNumber: document.trackingNumber,
        action: payload.action,
        stepNodeId: payload.stepNodeId ?? null,
      },
    })
  }

  private mapActionToTrigger(
    action: string,
    payload: DocumentActionEventPayload
  ): ActionMapping | null {
    switch (action) {
      case DocumentNotificationAction.SUBMIT:
        return {
          trigger: NotificationTrigger.SUBMITTED,
          title: (document) => `Document submitted: ${document.title}`,
          body: (document) => `Document ${document.trackingNumber} was submitted for processing.`,
        }
      case DocumentNotificationAction.EDIT:
        return {
          trigger: NotificationTrigger.EDITED,
          title: (document) => `Document updated: ${document.title}`,
          body: (document) => `Document ${document.trackingNumber} was edited.`,
        }
      case ApprovalAction.FORWARD:
      case 'assign':
        return {
          trigger: NotificationTrigger.ASSIGNED,
          title: (document) => `Document assigned: ${document.title}`,
          body: (document) =>
            action === 'assign'
              ? `Document ${document.trackingNumber} was assigned to you.`
              : `Document ${document.trackingNumber} was forwarded for review.`,
        }
      case ApprovalAction.APPROVE: {
        const completed = payload.metadata?.workflowCompleted === true
        return {
          trigger: NotificationTrigger.APPROVED,
          title: (document) =>
            completed
              ? `Document approved: ${document.title}`
              : `Approval step completed: ${document.title}`,
          body: (document) =>
            completed
              ? `Document ${document.trackingNumber} was fully approved.`
              : `A workflow step on ${document.trackingNumber} was approved.`,
        }
      }
      case ApprovalAction.REJECT:
        return {
          trigger: NotificationTrigger.REJECTED,
          title: (document) => `Document rejected: ${document.title}`,
          body: (document) => `Document ${document.trackingNumber} was rejected.`,
        }
      case ApprovalAction.RETURN:
        return {
          trigger: NotificationTrigger.RETURNED,
          title: (document) => `Document returned: ${document.title}`,
          body: (document) => `Document ${document.trackingNumber} was returned for revision.`,
        }
      default:
        return null
    }
  }

  private async resolveRecipients(
    payload: DocumentActionEventPayload,
    document: Document,
    trigger: NotificationTrigger
  ): Promise<string[]> {
    const stakeholders = await documentNotificationService.resolveStakeholderUserIds(
      document.id,
      payload.tenantId,
      payload.actorUserId
    )

    if (trigger === NotificationTrigger.ASSIGNED && payload.toUserId) {
      const recipients = new Set(stakeholders)
      recipients.add(payload.toUserId)
      if (payload.actorUserId) recipients.delete(payload.actorUserId)
      return [...recipients]
    }

    return stakeholders
  }
}
