import vine from '@vinejs/vine'

export const listNotificationsValidator = vine.compile(
  vine.object({
    page: vine.number().min(1).optional(),
    limit: vine.number().min(1).max(100).optional(),
  })
)

export const registerPushTokenValidator = vine.compile(
  vine.object({
    token: vine.string().trim().minLength(20).maxLength(500),
    platform: vine.string().trim().maxLength(30).optional(),
  })
)

export const removePushTokenValidator = vine.compile(
  vine.object({
    token: vine.string().trim().minLength(20).maxLength(500),
  })
)
