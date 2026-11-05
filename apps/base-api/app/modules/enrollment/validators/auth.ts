import vine from '@vinejs/vine'

export const loginValidator = vine.compile(
  vine.object({
    email: vine.string().email().normalizeEmail(),
    password: vine.string().minLength(8),
  })
)

export const refreshValidator = vine.compile(
  vine.object({
    refreshToken: vine.string().minLength(32),
  })
)
