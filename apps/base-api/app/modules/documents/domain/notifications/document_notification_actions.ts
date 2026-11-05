/** Routing / notification action strings for document lifecycle events outside ApprovalAction. */
export const DocumentNotificationAction = {
  SUBMIT: 'submit',
  EDIT: 'edit',
} as const

export type DocumentNotificationActionValue =
  (typeof DocumentNotificationAction)[keyof typeof DocumentNotificationAction]
