import vine from '@vinejs/vine'

export const saveFileEditValidator = vine.compile(
  vine.object({
    content: vine.string().optional(),
    sheets: vine
      .array(
        vine.object({
          name: vine.string().trim().minLength(1),
          csv: vine.string(),
        })
      )
      .optional(),
    changeNotes: vine.string().trim().maxLength(1000).optional(),
  })
)

export const replaceFileValidator = vine.compile(
  vine.object({
    changeNotes: vine.string().trim().minLength(3).maxLength(1000).optional(),
  })
)

export const createDocumentVersionValidator = vine.compile(
  vine.object({
    changeNotes: vine.string().trim().minLength(3).maxLength(1000).optional(),
  })
)

export const uploadFileMetadataValidator = vine.compile(
  vine.object({
    metadata: vine.record(vine.any()).optional(),
  })
)
