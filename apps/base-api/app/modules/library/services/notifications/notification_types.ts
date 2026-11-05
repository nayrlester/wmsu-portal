export type NotificationChannel = 'in_app' | 'email' | 'sms'

export type NotificationRecipientType = 'user' | 'member' | 'staff'

export const NOTIFICATION_EVENTS = {
  DUE_DATE_REMINDER: 'due_date_reminder',
  OVERDUE_NOTICE: 'overdue_notice',
  RESERVATION_READY: 'reservation_ready',
  RESERVATION_EXPIRED: 'reservation_expired',
  MEMBERSHIP_EXPIRING: 'membership_expiring',
  MEMBERSHIP_EXPIRED: 'membership_expired',
  FINE_ASSESSED: 'fine_assessed',
  BORROWING_REQUESTED: 'borrowing.requested',
  BORROWING_APPROVED: 'borrowing.approved',
  BORROWING_CHECKED_OUT: 'borrowing.checked_out',
  BORROWING_RETURNED: 'borrowing.returned',
  BORROWING_OVERDUE: 'borrowing.overdue',
  BORROWING_LOST: 'borrowing.lost',
} as const

export type NotificationEventType = (typeof NOTIFICATION_EVENTS)[keyof typeof NOTIFICATION_EVENTS]

export const DEFAULT_EVENT_CHANNELS: Record<string, NotificationChannel[]> = {
  [NOTIFICATION_EVENTS.DUE_DATE_REMINDER]: ['in_app', 'email'],
  [NOTIFICATION_EVENTS.OVERDUE_NOTICE]: ['in_app', 'email'],
  [NOTIFICATION_EVENTS.RESERVATION_READY]: ['in_app', 'email', 'sms'],
  [NOTIFICATION_EVENTS.RESERVATION_EXPIRED]: ['in_app'],
  [NOTIFICATION_EVENTS.MEMBERSHIP_EXPIRING]: ['in_app', 'email'],
  [NOTIFICATION_EVENTS.MEMBERSHIP_EXPIRED]: ['in_app', 'email'],
  [NOTIFICATION_EVENTS.FINE_ASSESSED]: ['in_app', 'email'],
  [NOTIFICATION_EVENTS.BORROWING_REQUESTED]: ['in_app'],
  [NOTIFICATION_EVENTS.BORROWING_APPROVED]: ['in_app', 'email'],
  [NOTIFICATION_EVENTS.BORROWING_CHECKED_OUT]: ['in_app', 'email'],
  [NOTIFICATION_EVENTS.BORROWING_RETURNED]: ['in_app'],
  [NOTIFICATION_EVENTS.BORROWING_OVERDUE]: ['in_app', 'email'],
  [NOTIFICATION_EVENTS.BORROWING_LOST]: ['in_app', 'email'],
}

export const SECURITY_EVENTS = new Set<string>([
  NOTIFICATION_EVENTS.MEMBERSHIP_EXPIRED,
])

export interface SendNotificationInput {
  tenantId: string
  eventType: string
  recipientType: NotificationRecipientType
  recipientId?: string
  title: string
  body: string
  payload?: Record<string, unknown>
  channels?: NotificationChannel[]
  email?: string | null
  phone?: string | null
  force?: boolean
}

export interface DispatchJobData extends SendNotificationInput {
  channels: NotificationChannel[]
}