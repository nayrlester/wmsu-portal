import { NotificationChannel } from '#modules/documents/domain/enums/index'

export enum NotificationTrigger {
  ASSIGNED = 'assigned',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  RETURNED = 'returned',
  SUBMITTED = 'submitted',
  EDITED = 'edited',
  SLA_BREACH = 'sla_breach',
  RETENTION_DUE = 'retention_due',
  RECORD_REQUEST_SUBMITTED = 'record_request_submitted',
  RECORD_REQUEST_APPROVED = 'record_request_approved',
  RECORD_REQUEST_DENIED = 'record_request_denied',
  RECORD_REQUEST_RELEASED = 'record_request_released',
  RECORD_REQUEST_RETURNED = 'record_request_returned',
  WORKFLOW_STEP = 'workflow_step',
  SLA_REMINDER = 'sla_reminder',
  SLA_ESCALATION = 'sla_escalation',
}

export interface NotificationJobPayload {
  tenantId: string
  userId: string
  channel: NotificationChannel
  type: NotificationTrigger | string
  title: string
  body: string | null
  data: Record<string, unknown> | null
  notificationId?: string
}

export interface NotificationDispatchInput {
  tenantId: string
  documentId: string
  trigger: NotificationTrigger
  recipientUserIds: string[]
  title: string
  body: string | null
  data?: Record<string, unknown> | null
  channels?: NotificationChannel[]
}

export const DEFAULT_NOTIFICATION_CHANNELS: NotificationChannel[] = [
  NotificationChannel.IN_APP,
  NotificationChannel.EMAIL,
  NotificationChannel.PUSH,
]
