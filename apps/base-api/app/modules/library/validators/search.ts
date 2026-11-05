import vine from '@vinejs/vine'

export const searchQueryValidator = vine.compile(
  vine.object({
    q: vine.string().trim().maxLength(500).optional(),
    types: vine.array(vine.enum(['book', 'member', 'transaction'])).optional(),
    preset: vine.enum(['available', 'overdue', 'most_borrowed', 'new_arrivals']).optional(),
    genre: vine.string().trim().maxLength(100).optional(),
    categoryId: vine.string().uuid().optional(),
    memberType: vine
      .enum(['student', 'faculty', 'employee', 'researcher', 'guest'])
      .optional(),
    status: vine.string().trim().maxLength(50).optional(),
    page: vine.number().min(1).optional(),
    perPage: vine.number().min(1).max(50).optional(),
  })
)

export const createSavedSearchValidator = vine.compile(
  vine.object({
    name: vine.string().trim().minLength(1).maxLength(200),
    query: vine.string().trim().maxLength(500).optional(),
    filters: vine
      .object({
        types: vine.array(vine.string()).optional(),
        preset: vine.string().optional(),
        genre: vine.string().optional(),
        categoryId: vine.string().uuid().optional(),
        memberType: vine.string().optional(),
        status: vine.string().optional(),
      })
      .optional(),
  })
)
