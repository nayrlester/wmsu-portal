import vine from '@vinejs/vine'

const materialType = vine.enum([
  'book',
  'serial',
  'journal',
  'article',
  'thesis',
  'dissertation',
  'audiovisual',
  'electronic',
] as const)
const classificationScheme = vine.enum(['ddc', 'lcc'] as const)

export const createBookValidator = vine.compile(
  vine.object({
    title: vine.string().trim().minLength(1).maxLength(500),
    subtitle: vine.string().trim().maxLength(500).optional(),
    isbn13: vine.string().trim().maxLength(13).optional(),
    isbn10: vine.string().trim().maxLength(10).optional(),
    issn: vine.string().trim().maxLength(20).optional(),
    catalogBarcode: vine.string().trim().maxLength(50).optional(),
    genre: vine.string().trim().maxLength(100).optional(),
    materialType: materialType.optional(),
    classificationScheme: classificationScheme.optional(),
    classificationNumber: vine.string().trim().maxLength(100).optional(),
    publicationYear: vine.number().min(1000).max(9999).optional(),
    publisherName: vine.string().trim().maxLength(300).optional(),
    categoryName: vine.string().trim().maxLength(200).optional(),
    description: vine.string().trim().optional(),
    isDigital: vine.boolean().optional(),
    coverImageUrl: vine.string().trim().url().optional(),
    authors: vine.array(vine.string().trim().minLength(1)).minLength(1),
    subjects: vine.array(vine.string().trim().minLength(1)).optional(),
    marcControlNumber: vine.string().trim().maxLength(50).optional(),
    marcFields: vine.record(vine.any()).optional(),
    dublinCore: vine.record(vine.any()).optional(),
    initialCopies: vine.number().min(0).max(100).optional(),
    shelfLocation: vine.string().trim().maxLength(100).optional(),
  })
)

export const updateBookValidator = vine.compile(
  vine.object({
    title: vine.string().trim().minLength(1).maxLength(500).optional(),
    subtitle: vine.string().trim().maxLength(500).nullable().optional(),
    isbn13: vine.string().trim().maxLength(13).nullable().optional(),
    isbn10: vine.string().trim().maxLength(10).nullable().optional(),
    issn: vine.string().trim().maxLength(20).nullable().optional(),
    catalogBarcode: vine.string().trim().maxLength(50).nullable().optional(),
    genre: vine.string().trim().maxLength(100).nullable().optional(),
    materialType: materialType.optional(),
    classificationScheme: classificationScheme.nullable().optional(),
    classificationNumber: vine.string().trim().maxLength(100).nullable().optional(),
    publicationYear: vine.number().min(1000).max(9999).nullable().optional(),
    publisherName: vine.string().trim().maxLength(300).nullable().optional(),
    categoryName: vine.string().trim().maxLength(200).nullable().optional(),
    description: vine.string().trim().nullable().optional(),
    isDigital: vine.boolean().optional(),
    coverImageUrl: vine.string().trim().url().nullable().optional(),
    authors: vine.array(vine.string().trim().minLength(1)).minLength(1).optional(),
    subjects: vine.array(vine.string().trim().minLength(1)).optional(),
    marcControlNumber: vine.string().trim().maxLength(50).nullable().optional(),
    marcFields: vine.record(vine.any()).nullable().optional(),
    dublinCore: vine.record(vine.any()).nullable().optional(),
  })
)

export const createCopyValidator = vine.compile(
  vine.object({
    barcode: vine.string().trim().maxLength(50).optional(),
    shelfLocation: vine.string().trim().maxLength(100).optional(),
    condition: vine.string().trim().maxLength(20).optional(),
    notes: vine.string().trim().optional(),
  })
)

export const updateCopyValidator = vine.compile(
  vine.object({
    barcode: vine.string().trim().maxLength(50).optional(),
    shelfLocation: vine.string().trim().maxLength(100).nullable().optional(),
    status: vine
      .enum(['available', 'on_loan', 'reserved', 'maintenance', 'lost', 'withdrawn'])
      .optional(),
    condition: vine.string().trim().maxLength(20).nullable().optional(),
    notes: vine.string().trim().nullable().optional(),
  })
)

export const listBooksValidator = vine.compile(
  vine.object({
    search: vine.string().trim().optional(),
    categoryId: vine.string().uuid().optional(),
    genre: vine.string().trim().optional(),
    isDigital: vine.boolean().optional(),
    materialType: materialType.optional(),
    author: vine.string().trim().optional(),
    publisher: vine.string().trim().optional(),
    subject: vine.string().trim().optional(),
    isbn: vine.string().trim().optional(),
    classification: vine.string().trim().optional(),
    sortBy: vine.enum(['title', 'createdAt', 'publicationYear', 'materialType']).optional(),
    sortDir: vine.enum(['asc', 'desc']).optional(),
    page: vine.number().min(1).optional(),
    perPage: vine.number().min(1).max(100).optional(),
  })
)

export const batchBookIdsValidator = vine.compile(
  vine.object({
    ids: vine.array(vine.string().uuid()).minLength(1).maxLength(100),
  })
)

export const batchUpdateBooksValidator = vine.compile(
  vine.object({
    ids: vine.array(vine.string().uuid()).minLength(1).maxLength(100),
    materialType: materialType.optional(),
    genre: vine.string().trim().maxLength(100).nullable().optional(),
    categoryName: vine.string().trim().maxLength(200).nullable().optional(),
    classificationScheme: classificationScheme.nullable().optional(),
    classificationNumber: vine.string().trim().maxLength(100).nullable().optional(),
  })
)
