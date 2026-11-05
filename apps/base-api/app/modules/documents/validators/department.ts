import vine from '@vinejs/vine'

const departmentCode = vine
  .string()
  .trim()
  .maxLength(50)
  .regex(/^[A-Za-z0-9_-]+$/)

export const createDepartmentValidator = vine.compile(
  vine.object({
    name: vine.string().trim().minLength(2).maxLength(255),
    code: departmentCode.optional(),
    description: vine.string().trim().maxLength(2000).optional(),
    isActive: vine.boolean().optional(),
  })
)

export const updateDepartmentValidator = vine.compile(
  vine.object({
    name: vine.string().trim().minLength(2).maxLength(255).optional(),
    code: departmentCode.nullable().optional(),
    description: vine.string().trim().maxLength(2000).nullable().optional(),
    isActive: vine.boolean().optional(),
  })
)
