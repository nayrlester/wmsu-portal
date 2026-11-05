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
      const term = `%${filters.q.toLowerCase()}%`
      query.where((q) => {
        q.whereILike('title', term)
          .orWhereILike('author_names', term)
          .orWhereILike('genre', term)
          .orWhereILike('description', term)
          .orWhereILike('search_text', term)
      })
    }

    if (filters.title) query.whereILike('title', `%${filters.title}%`)
    if (filters.author) query.whereILike('author_names', `%${filters.author}%`)
    if (filters.subject) query.whereILike('genre', `%${filters.subject}%`)
    if (filters.callNumber) query.whereILike('catalog_barcode', `%${filters.callNumber}%`)
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
    const year = new Date().getFullYear()
    const title = book.title

    return {
      apa: `${authors}. (${year}). ${title}.`,
      mla: `${authors}. ${title}. ${year}.`,
    }
  }

  private serialize(book: Book, availableCopies: number, totalCopies: number) {
    return {
      id: book.id,
      title: book.title,
      subtitle: book.subtitle,
      authors: book.authorNames,
      genre: book.genre,
      category: book.category?.name ?? null,
      isbn13: book.isbn13,
      callNumber: book.catalogBarcode,
      isDigital: book.isDigital,
      coverImageUrl: book.coverImageUrl,
      availableCopies,
      totalCopies,
      availability: availableCopies > 0 ? 'available' : 'unavailable',
    }
  }
}
