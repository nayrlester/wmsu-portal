import vine from '@vinejs/vine'

export const setLegalHoldValidator = vine.compile(
  vine.object({
    hold: vine.boolean(),
    reason: vine.string().trim().minLength(3).maxLength(2000),
  })
)

export const listArchivesValidator = vine.compile(
  vine.object({
    status: vine.string().trim().optional(),
    page: vine.number().min(1).optional(),
    limit: vine.number().min(1).max(100).optional(),
  })
)

export const createTransferValidator = vine.compile(
  vine.object({
    title: vine.string().trim().minLength(3).maxLength(255),
    notes: vine.string().trim().maxLength(2000).optional(),
    documentIds: vine.array(vine.string().uuid()).minLength(1),
  })
)

export const createDisposalValidator = vine.compile(
  vine.object({
    title: vine.string().trim().minLength(3).maxLength(255),
    justification: vine.string().trim().minLength(10).maxLength(4000),
    documentIds: vine.array(vine.string().uuid()).minLength(1),
  })
)

export const approveDisposalValidator = vine.compile(vine.object({}))

export const executeDisposalValidator = vine.compile(
  vine.object({
    notes: vine.string().trim().maxLength(2000).optional(),
  })
)
