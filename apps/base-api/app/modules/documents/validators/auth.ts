import vine from '@vinejs/vine'

export const loginValidator = vine.compile(
  vine.object({
    email: vine.string().email().normalizeEmail(),
    password: vine.string().minLength(8),
    mfaCode: vine.string().fixedLength(6).optional(),
  })
)

export const registerValidator = vine.compile(
  vine.object({
    email: vine.string().email(),
    password: vine.string().minLength(8),
    passwordConfirmation: vine.string().sameAs('password'),
    fullName: vine.string().minLength(2).maxLength(255),
    organizationName: vine.string().minLength(2).maxLength(255),
  })
)

export const refreshValidator = vine.compile(
  vine.object({
    refreshToken: vine.string().minLength(32),
  })
)

export const forgotPasswordValidator = vine.compile(
  vine.object({
    email: vine.string().email().normalizeEmail(),
  })
)

export const resetPasswordValidator = vine.compile(
  vine.object({
    token: vine.string().minLength(32),
    password: vine.string().minLength(8),
    passwordConfirmation: vine.string().sameAs('password'),
  })
)

export const verifyEmailValidator = vine.compile(
  vine.object({
    token: vine.string().minLength(32),
  })
)

export const resendVerificationValidator = vine.compile(
  vine.object({
    email: vine.string().email().normalizeEmail(),
  })
)

export const mfaChallengeValidator = vine.compile(
  vine.object({
    mfaChallengeToken: vine.string(),
    mfaCode: vine.string().fixedLength(6),
  })
)

export const mfaCodeValidator = vine.compile(
  vine.object({
    code: vine.string().fixedLength(6),
  })
)
