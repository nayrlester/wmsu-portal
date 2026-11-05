import vine from '@vinejs/vine'

export const submitCertRequestValidator = vine.compile(
  vine.object({
    studentNumber: vine.string().trim().minLength(1).maxLength(64),
    certificationType: vine.string().trim().minLength(1).maxLength(64),
    purpose: vine.string().trim().minLength(1).maxLength(255),
    locality: vine.enum(['local', 'foreign'] as const).optional(),
    agency: vine.string().trim().maxLength(255).optional(),
    destinationCountry: vine.string().trim().maxLength(128).optional(),
    urgency: vine.string().trim().maxLength(32).optional(),
    copies: vine.number().min(1).max(50).optional(),
  })
)

export const listCertRequestsValidator = vine.compile(
  vine.object({
    status: vine.enum(['pending', 'processing', 'approved', 'released'] as const).optional(),
    studentNumber: vine.string().trim().maxLength(64).optional(),
    requestNumber: vine.string().trim().maxLength(64).optional(),
    certificationType: vine.string().trim().maxLength(64).optional(),
    locality: vine.enum(['local', 'foreign'] as const).optional(),
    mineOnly: vine.boolean().optional(),
    page: vine.number().min(1).optional(),
    limit: vine.number().min(1).max(200).optional(),
  })
)

export const transitionCertRequestValidator = vine.compile(
  vine.object({
    toStatus: vine.enum(['pending', 'processing', 'approved', 'released'] as const),
    reason: vine.string().trim().maxLength(1000).optional(),
    clearanceOverride: vine.boolean().optional(),
    paymentOverride: vine.boolean().optional(),
  })
)

export const certAttachmentRefValidator = vine.compile(
  vine.object({
    udmsDocumentId: vine.string().trim().minLength(1).maxLength(128),
    kind: vine.string().trim().maxLength(64).optional(),
  })
)

export const certPaymentVerifyValidator = vine.compile(
  vine.object({
    paymentRef: vine.string().trim().minLength(1).maxLength(128),
    orNumber: vine.string().trim().maxLength(128).optional(),
  })
)

export const updateCertTypeValidator = vine.compile(
  vine.object({
    active: vine.boolean().optional(),
    description: vine.string().trim().maxLength(2000).optional(),
    processingNotes: vine.string().trim().maxLength(2000).optional(),
  })
)
