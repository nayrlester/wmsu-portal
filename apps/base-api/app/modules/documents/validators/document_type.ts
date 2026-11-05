import vine from '@vinejs/vine'

const documentTypeCode = vine
  .string()
  .trim()
  .minLength(2)
  .maxLength(50)
  .regex(/^[A-Za-z0-9_-]+$/)

export const createDocumentTypeValidator = vine.compile(
  vine.object({
    name: vine.string().trim().minLength(2).maxLength(255),
    code: documentTypeCode,
    description: vine.string().trim().maxLength(2000).optional(),
    isActive: vine.boolean().optional(),
  })
)

export const updateDocumentTypeValidator = vine.compile(
  vine.object({
    name: vine.string().trim().minLength(2).maxLength(255).optional(),
    code: documentTypeCode.optional(),
    description: vine.string().trim().maxLength(2000).nullable().optional(),
    isActive: vine.boolean().optional(),
  })
)
