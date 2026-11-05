import { tormsOutboxService } from '#modules/records/services/torms/torms_outbox_service'
import { auditLogService } from '#modules/records/services/audit_log_service'

/**
 * Notification integration for TOR-027 progress notices.
 * Enqueues Platform CIS outbox events; does not create an independent mailer.
 */
export class TormsNotificationService {
  async enqueueRequestProgress(input: {
    organizationId: string
    requestId: string
    requestNumber: string
    studentNumber: string
    eventType: string
    message: string
    actorUserId?: string | null
  }) {
    const row = await tormsOutboxService.enqueue({
      organizationId: input.organizationId,
      contractCode: 'INT-TOR-11',
      targetSystem: 'platform_cis',
      eventType: input.eventType,
      idempotencyKey: `${input.requestId}:${input.eventType}:${Date.now()}`,
      payload: {
        requestNumber: input.requestNumber,
        studentNumber: input.studentNumber,
        message: input.message,
      },
    })

    await auditLogService.log({
      organizationId: input.organizationId,
      actorUserId: input.actorUserId ?? null,
      action: 'torms.notification.enqueued',
      entityType: 'tor_request',
      entityId: input.requestId,
      metadata: {
        eventType: input.eventType,
        outboxId: row.id,
      },
    })

    return row
  }
}

export const tormsNotificationService = new TormsNotificationService()
