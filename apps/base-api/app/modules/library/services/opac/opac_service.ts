import Book from '#modules/library/models/book'
import BookCopy from '#modules/library/models/book_copy'
import { borrowingTenantId } from '#modules/library/services/borrowing/borrowing_helpers'

export interface OpacSearchFilters {
  q?: string
  title?: string
  author?: string
  subject?: string
  callNumber?: string
  year?: number
  isbn?: string
  resourceType?: 'physical' | 'digital' | 'all'
  availability?: 'available' | 'any'
  language?: string
  page?: number
  perPage?: number
}

export default class OpacService {
  async search(filters: OpacSearchFilters) {
    const page = filters.page ?? 1
    const perPage = Math.min(filters.perPage ?? 20, 100)
    const tid = borrowingTenantId()

    const query = Book.query().where('tenant_id', tid).whereNull('deleted_at').preload('category')

    if (filters.q) {
      const term = `%${filters.q}%`
      query.where((builder) => {
        builder
          .whereILike('title', term)
          .orWhereILike('author_names', term)
          .orWhereILike('genre', term)
          .orWhereILike('subject_names', term)
          .orWhereILike('description', term)
          .orWhereILike('search_text', term)
          .orWhereILike('isbn13', term)
          .orWhereILike('isbn10', term)
          .orWhereILike('issn', term)
          .orWhereILike('classification_number', term)
          .orWhereILike('catalog_barcode', term)
      })
    }

    if (filters.title) query.whereILike('title', `%${filters.title}%`)
    if (filters.author) query.whereILike('author_names', `%${filters.author}%`)
    if (filters.subject) {
      const term = `%${filters.subject}%`
      query.where((builder) => {
        builder.whereILike('genre', term).orWhereILike('subject_names', term)
      })
    }
    if (filters.callNumber) {
      const term = `%${filters.callNumber}%`
      query.where((builder) => {
        builder.whereILike('catalog_barcode', term).orWhereILike('classification_number', term)
      })
    }
    if (filters.year) query.where('publication_year', filters.year)
    if (filters.isbn) {
      const term = `%${filters.isbn}%`
      query.where((builder) => {
        builder.whereILike('isbn13', term).orWhereILike('isbn10', term).orWhereILike('issn', term)
      })
    }
    if (filters.language) {
      const term = `%${filters.language}%`
      query.where((builder) => {
        builder
          .whereRaw(`coalesce(dublin_core->>'language', '') ilike ?`, [term])
          .orWhereILike('search_text', term)
      })
    }
    if (filters.resourceType === 'digital') query.where('is_digital', true)
    if (filters.resourceType === 'physical') query.where('is_digital', false)

    const paginator = await query.orderBy('title', 'asc').paginate(page, perPage)
    const books = paginator.all()

    const enriched = await Promise.all(
      books.map(async (book) => {
        const copies = await BookCopy.query()
          .where('book_id', book.id)
          .where('tenant_id', tid)
          .whereNull('deleted_at')

        const available = copies.filter((c) => c.status === 'available').length
        return this.serialize(book, available, copies.length)
      })
    )

    const filtered =
      filters.availability === 'available' ? enriched.filter((b) => b.availableCopies > 0) : enriched

    return {
      data: filtered,
      meta: {
        page: paginator.currentPage,
        perPage: paginator.perPage,
        total: paginator.total,
        totalPages: paginator.lastPage,
      },
    }
  }

  async show(bookId: string) {
    const tid = borrowingTenantId()
    const book = await Book.query()
      .where('id', bookId)
      .where('tenant_id', tid)
      .whereNull('deleted_at')
      .preload('category')
      .preload('publisher')
      .firstOrFail()

    const copies = await BookCopy.query()
      .where('book_id', book.id)
      .where('tenant_id', tid)
      .whereNull('deleted_at')

    const available = copies.filter((c) => c.status === 'available').length
    return {
      ...this.serialize(book, available, copies.length),
      description: book.description,
      publisher: book.publisher?.name ?? null,
      citations: this.buildCitations(book),
      shelfLocations: copies
        .map((c) => c.shelfLocation)
        .filter(Boolean)
        .slice(0, 5),
    }
  }

  buildCitations(book: Book) {
    const authors = book.authorNames ?? 'Unknown'
    const year = book.publicationYear ?? 'n.d.'
    const title = book.title

    return {
      apa: `${authors}. (${year}). ${title}.`,
      mla: `${authors}. ${title}. ${year}.`,
    }
  }

  private serialize(book: Book, availableCopies: number, totalCopies: number) {
    const thesis = book.materialType === 'dissertation' || book.materialType === 'thesis'
    const dc = book.dublinCore
    return {
      id: book.id,
      title: book.title,
      subtitle: book.subtitle,
      authors: book.authorNames,
      genre: book.genre,
      category: book.category?.name ?? null,
      isbn13: book.isbn13,
      issn: book.issn,
      callNumber: book.classificationNumber || book.catalogBarcode,
      publicationYear: book.publicationYear,
      materialType: book.materialType,
      detailProfile: thesis ? 'thesis' : 'catalog',
      degree: thesis ? dcText(dc, 'degree') : null,
      department: thesis ? dcText(dc, 'department') : null,
      advisor: thesis ? dcText(dc, 'advisor') : null,
      isDigital: book.isDigital,
      coverImageUrl: book.coverImageUrl,
      availableCopies,
      totalCopies,
      availability: availableCopies > 0 ? 'available' : 'unavailable',
    }
  }
}

function dcText(dc: Record<string, unknown> | null, key: string) {
  const value = dc?.[key]
  return typeof value === 'string' && value.trim() ? value.trim() : null
}
