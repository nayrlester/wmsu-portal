import vine from '@vinejs/vine'

export const submitTorRequestValidator = vine.compile(
  vine.object({
    studentNumber: vine.string().trim().minLength(1).maxLength(64),
    purpose: vine.string().trim().minLength(1).maxLength(255),
    locality: vine.enum(['local', 'foreign'] as const).optional(),
    agency: vine.string().trim().maxLength(255).optional(),
    destinationCountry: vine.string().trim().maxLength(128).optional(),
    urgency: vine.string().trim().maxLength(32).optional(),
    copies: vine.number().min(1).max(50).optional(),
    isFirstRequestAfterGraduation: vine.boolean().optional(),
  })
)

export const listTorRequestsValidator = vine.compile(
  vine.object({
    status: vine.enum(['pending', 'processing', 'approved', 'released'] as const).optional(),
    studentNumber: vine.string().trim().maxLength(64).optional(),
    requestNumber: vine.string().trim().maxLength(64).optional(),
    mineOnly: vine.boolean().optional(),
    page: vine.number().min(1).optional(),
    limit: vine.number().min(1).max(200).optional(),
  })
)

export const transitionTorRequestValidator = vine.compile(
  vine.object({
    toStatus: vine.enum(['pending', 'processing', 'approved', 'released'] as const),
    reason: vine.string().trim().maxLength(1000).optional(),
    clearanceOverride: vine.boolean().optional(),
    paymentOverride: vine.boolean().optional(),
  })
)

export const torAttachmentRefValidator = vine.compile(
  vine.object({
    udmsDocumentId: vine.string().trim().minLength(1).maxLength(128),
    kind: vine.string().trim().maxLength(64).optional(),
  })
)

export const torPaymentVerifyValidator = vine.compile(
  vine.object({
    paymentRef: vine.string().trim().minLength(1).maxLength(128),
    orNumber: vine.string().trim().maxLength(128).optional(),
  })
)

export const confirmPhysicalValidator = vine.compile(
  vine.object({
    notes: vine.string().trim().maxLength(1000).optional(),
  })
)
