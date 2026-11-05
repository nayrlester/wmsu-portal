import vine from '@vinejs/vine'

export const listNotificationsValidator = vine.compile(
  vine.object({
    page: vine.number().min(1).optional(),
    perPage: vine.number().min(1).max(50).optional(),
  })
)

export const updateNotificationPreferenceValidator = vine.compile(
  vine.object({
    eventType: vine.string().trim().minLength(1).maxLength(50),
    emailEnabled: vine.boolean().optional(),
    inAppEnabled: vine.boolean().optional(),
    smsEnabled: vine.boolean().optional(),
  })
)
