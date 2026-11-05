import vine from '@vinejs/vine'

export const listAcquisitionsValidator = vine.compile(
  vine.object({
    search: vine.string().trim().optional(),
    status: vine
      .enum(['draft', 'submitted', 'routed', 'acknowledged', 'cataloged', 'cancelled'])
      .optional(),
    memberId: vine.string().uuid().optional(),
    page: vine.number().min(1).optional(),
    perPage: vine.number().min(1).max(100).optional(),
  })
)

export const createAcquisitionValidator = vine.compile(
  vine.object({
    title: vine.string().trim().minLength(1).maxLength(500),
    authors: vine.string().trim().maxLength(500).optional(),
    isbn13: vine.string().trim().maxLength(20).optional(),
    materialType: vine.string().trim().maxLength(64).optional(),
    publisherName: vine.string().trim().maxLength(255).optional(),
    publicationYear: vine.number().min(1000).max(9999).optional(),
    quantity: vine.number().min(1).max(10000).optional(),
    justification: vine.string().trim().maxLength(5000).optional(),
    requestingUnit: vine.string().trim().maxLength(255).optional(),
    notes: vine.string().trim().maxLength(2000).optional(),
    memberId: vine.string().uuid().optional(),
    bookId: vine.string().uuid().optional(),
  })
)

export const updateAcquisitionValidator = vine.compile(
  vine.object({
    title: vine.string().trim().minLength(1).maxLength(500).optional(),
    authors: vine.string().trim().maxLength(500).optional().nullable(),
    isbn13: vine.string().trim().maxLength(20).optional().nullable(),
    materialType: vine.string().trim().maxLength(64).optional().nullable(),
    publisherName: vine.string().trim().maxLength(255).optional().nullable(),
    publicationYear: vine.number().min(1000).max(9999).optional().nullable(),
    quantity: vine.number().min(1).max(10000).optional(),
    justification: vine.string().trim().maxLength(5000).optional().nullable(),
    requestingUnit: vine.string().trim().maxLength(255).optional().nullable(),
    notes: vine.string().trim().maxLength(2000).optional().nullable(),
    memberId: vine.string().uuid().optional().nullable(),
    bookId: vine.string().uuid().optional().nullable(),
  })
)

export const cancelAcquisitionValidator = vine.compile(
  vine.object({
    reason: vine.string().trim().maxLength(1000).optional(),
  })
)

export const acknowledgeAcquisitionValidator = vine.compile(
  vine.object({
    ufmsPrRef: vine.string().trim().minLength(1).maxLength(128),
  })
)

export const catalogAcquisitionValidator = vine.compile(
  vine.object({
    catalogedBookId: vine.string().uuid(),
  })
)
