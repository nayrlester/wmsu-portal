import vine from '@vinejs/vine'

export const loginValidator = vine.compile(
  vine.object({
    email: vine.string().email().trim(),
    password: vine.string().minLength(8),
    tenantSlug: vine.string().trim().optional(),
  })
)

export const registerValidator = vine.compile(
  vine.object({
    tenantName: vine.string().trim().minLength(2).maxLength(200),
    tenantSlug: vine
      .string()
      .trim()
      .minLength(2)
      .maxLength(63)
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    tenantType: vine.enum([
      'school',
      'university',
      'public_library',
      'corporate',
      'government',
    ]),
    fullName: vine.string().trim().minLength(2).maxLength(200),
    email: vine.string().email().trim(),
    password: vine.string().minLength(8).maxLength(72),
  })
)

export const refreshValidator = vine.compile(
  vine.object({
    refreshToken: vine.string(),
  })
)

export const inviteUserValidator = vine.compile(
  vine.object({
    email: vine.string().email().trim(),
    fullName: vine.string().trim().minLength(2).maxLength(200),
    roleCode: vine.enum(['admin', 'librarian', 'staff', 'faculty', 'student', 'member']),
    password: vine.string().minLength(8).maxLength(72).optional(),
  })
)

export const updateUserValidator = vine.compile(
  vine.object({
    fullName: vine.string().trim().minLength(2).maxLength(200).optional(),
    status: vine.enum(['invited', 'active', 'suspended', 'deactivated']).optional(),
    roleCode: vine.enum(['admin', 'librarian', 'staff', 'faculty', 'student', 'member']).optional(),
  })
)
