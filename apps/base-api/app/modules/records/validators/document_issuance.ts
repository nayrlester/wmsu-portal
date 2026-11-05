import vine from '@vinejs/vine'

export const generateTorIssuanceValidator = vine.compile(
  vine.object({
    copyType: vine.enum(['student', 'official'] as const).optional(),
  })
)

export const issueDocumentValidator = vine.compile(
  vine.object({
    releaseRequest: vine.boolean().optional(),
  })
)

export const printLogValidator = vine.compile(
  vine.object({
    action: vine.enum(['print', 'reprint'] as const),
    reason: vine.string().trim().minLength(1).maxLength(2000).optional(),
  })
)

export const publicVerifyValidator = vine.compile(
  vine.object({
    codeOrRef: vine.string().trim().minLength(4).maxLength(128),
  })
)
