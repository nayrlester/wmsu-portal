import vine from '@vinejs/vine'

export const createRoleValidator = vine.compile(
  vine.object({
    name: vine.string().minLength(2).maxLength(100),
    slug: vine.string().minLength(2).maxLength(100).regex(/^[a-z0-9_]+$/),
    description: vine.string().maxLength(500).optional(),
    permissionIds: vine.array(vine.string().uuid()).optional(),
  })
)

export const updateRoleValidator = vine.compile(
  vine.object({
    name: vine.string().trim().minLength(2).maxLength(100),
    description: vine.string().trim().maxLength(500).nullable().optional(),
  })
)

export const updateRolePermissionsValidator = vine.compile(
  vine.object({
    permissionIds: vine.array(vine.string().uuid()),
  })
)

export const assignRoleValidator = vine.compile(
  vine.object({
    roleId: vine.string().uuid(),
  })
)
