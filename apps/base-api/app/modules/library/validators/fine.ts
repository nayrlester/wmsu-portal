import vine from '@vinejs/vine'

export const listFinesValidator = vine.compile(
  vine.object({
    memberId: vine.string().uuid().optional(),
    status: vine.enum(['pending', 'partial', 'paid', 'waived']).optional(),
    page: vine.number().min(1).optional(),
    perPage: vine.number().min(1).max(100).optional(),
  })
)

export const createManualFineValidator = vine.compile(
  vine.object({
    memberId: vine.string().uuid(),
    amountCents: vine.number().min(1),
    notes: vine.string().trim().maxLength(1000).optional(),
  })
)

export const adjustFineValidator = vine.compile(
  vine.object({
    amountCents: vine.number().min(1),
    notes: vine.string().trim().maxLength(1000).optional(),
  })
)

export const waiveFineValidator = vine.compile(
  vine.object({
    amountCents: vine.number().min(1).optional(),
    reason: vine.string().trim().minLength(3).maxLength(500),
  })
)

export const recordPaymentValidator = vine.compile(
  vine.object({
    amountCents: vine.number().min(1),
    paymentMethod: vine.string().trim().maxLength(30).optional(),
    reference: vine.string().trim().maxLength(100).optional(),
  })
)
