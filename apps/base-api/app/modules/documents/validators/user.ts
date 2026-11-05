import vine from '@vinejs/vine'

/**
 * Shared rules for email and password.
 */
const email = () => vine.string().email().maxLength(254)
const password = () => vine.string().minLength(8).maxLength(32)

export const listTenantUsersValidator = vine.compile(
  vine.object({
    search: vine.string().maxLength(100).optional(),
    page: vine.number().min(1).optional(),
    limit: vine.number().min(1).max(100).optional(),
  })
)

export const createTenantUserValidator = vine.compile(
  vine.object({
    email: email().normalizeEmail(),
    fullName: vine.string().trim().minLength(2).maxLength(255),
    roleId: vine.string().uuid(),
    password: password().optional(),
  })
)

export const updateTenantUserValidator = vine.compile(
  vine.object({
    fullName: vine.string().trim().minLength(2).maxLength(255).optional(),
    status: vine.enum(['active', 'inactive']).optional(),
    roleId: vine.string().uuid().optional(),
  })
)
