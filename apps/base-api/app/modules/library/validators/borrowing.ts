import vine from '@vinejs/vine'

export const listBorrowingsValidator = vine.compile(
  vine.object({
    search: vine.string().trim().optional(),
    status: vine
      .enum(['requested', 'approved', 'borrowed', 'returned', 'overdue', 'lost'])
      .optional(),
    memberId: vine.string().uuid().optional(),
    page: vine.number().min(1).optional(),
    perPage: vine.number().min(1).max(100).optional(),
  })
)

export const requestBorrowValidator = vine.compile(
  vine.object({
    memberId: vine.string().uuid(),
    bookId: vine.string().uuid(),
    copyId: vine.string().uuid().optional(),
    notes: vine.string().trim().maxLength(1000).optional(),
    borrowedAt: vine.string().trim().optional(),
    dueAt: vine.string().trim().optional(),
  })
)

export const approveBorrowValidator = vine.compile(
  vine.object({
    copyId: vine.string().uuid().optional(),
  })
)

export const directCheckoutValidator = vine.compile(
  vine.object({
    memberId: vine.string().uuid(),
    copyId: vine.string().uuid(),
    notes: vine.string().trim().maxLength(1000).optional(),
    borrowedAt: vine.string().trim().optional(),
    dueAt: vine.string().trim().optional(),
  })
)

export const returnBorrowValidator = vine.compile(
  vine.object({
    notes: vine.string().trim().maxLength(1000).optional(),
  })
)
