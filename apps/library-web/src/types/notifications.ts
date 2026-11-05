export interface InAppNotification {
  id: string
  eventType: string
  title: string
  body: string
  payload: Record<string, unknown>
  readAt: string | null
  createdAt: string
}

export interface NotificationPreference {
  eventType: string
  emailEnabled: boolean
  inAppEnabled: boolean
  smsEnabled: boolean
}
