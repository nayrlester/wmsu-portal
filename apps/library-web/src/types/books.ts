export type BookCopyStatus =
  | 'available'
  | 'on_loan'
  | 'reserved'
  | 'maintenance'
  | 'lost'
  | 'withdrawn'
  | 'damaged'
  | 'under_repair'

export type MaterialType =
  | 'book'
  | 'serial'
  | 'journal'
  | 'article'
  | 'thesis'
  | 'dissertation'
  | 'audiovisual'
  | 'electronic'

export type ClassificationScheme = 'ddc' | 'lcc'

export interface BookCopy {
  id: string
  bookId: string
  barcode: string
  copyNumber: number
  status: BookCopyStatus
  shelfLocation: string | null
  condition: string | null
  notes: string | null
  createdAt: string
}

export interface Book {
  id: string
  title: string
  subtitle: string | null
  isbn13: string | null
  isbn10: string | null
  issn: string | null
  catalogBarcode: string | null
  genre: string | null
  materialType: MaterialType | string
  classificationScheme: ClassificationScheme | string | null
  classificationNumber: string | null
  publicationYear: number | null
  description: string | null
  isDigital: boolean
  coverImageUrl: string | null
  authors: string[]
  subjects: string[]
  publisher: string | null
  category: string | null
  categoryId: string | null
  publisherId: string | null
  marcControlNumber?: string | null
  dublinCore?: Record<string, unknown> | null
  metadataVersion?: number
  quantity: number
  availableCopies: number
  onLoanCopies: number
  reservedCopies: number
  maintenanceCopies: number
  createdAt: string
  updatedAt: string | null
  copies?: BookCopy[]
  digitalFiles?: BookDigitalFile[]
}

export interface BookDigitalFile {
  id: string
  bookId: string
  platformDocumentId: string
  originalName: string
  contentType: string | null
  sizeBytes: number
  uploadedBy: string | null
  createdAt: string | null
}

export interface BookCategory {
  id: string
  name: string
  slug: string
}

export interface BookListParams {
  search?: string
  categoryId?: string
  genre?: string
  isDigital?: boolean
  materialType?: MaterialType | string
  author?: string
  publisher?: string
  subject?: string
  isbn?: string
  classification?: string
  sortBy?: 'title' | 'createdAt' | 'publicationYear' | 'materialType'
  sortDir?: 'asc' | 'desc'
  page?: number
  perPage?: number
}

export interface CreateBookPayload {
  title: string
  subtitle?: string
  isbn13?: string
  isbn10?: string
  issn?: string
  catalogBarcode?: string
  genre?: string
  materialType?: MaterialType
  classificationScheme?: ClassificationScheme
  classificationNumber?: string
  publicationYear?: number
  publisherName?: string
  categoryName?: string
  description?: string
  isDigital?: boolean
  authors: string[]
  subjects?: string[]
  initialCopies?: number
  shelfLocation?: string
}

export interface UpdateBookPayload {
  title?: string
  subtitle?: string | null
  isbn13?: string | null
  isbn10?: string | null
  issn?: string | null
  catalogBarcode?: string | null
  genre?: string | null
  materialType?: MaterialType
  classificationScheme?: ClassificationScheme | null
  classificationNumber?: string | null
  publicationYear?: number | null
  publisherName?: string | null
  categoryName?: string | null
  description?: string | null
  isDigital?: boolean
  authors?: string[]
  subjects?: string[]
}

export interface CreateCopyPayload {
  barcode?: string
  shelfLocation?: string
  condition?: string
  notes?: string
}

export interface PaginatedMeta {
  page: number
  perPage: number
  total: number
  totalPages: number
}

export const MATERIAL_TYPE_OPTIONS: { value: MaterialType; label: string }[] = [
  { value: 'book', label: 'Book' },
  { value: 'serial', label: 'Serial' },
  { value: 'journal', label: 'Journal' },
  { value: 'article', label: 'Article' },
  { value: 'thesis', label: 'Thesis' },
  { value: 'dissertation', label: 'Dissertation' },
  { value: 'audiovisual', label: 'Audiovisual' },
  { value: 'electronic', label: 'Electronic' },
]
