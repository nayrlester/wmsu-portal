import { DateTime } from 'luxon'
import db from '@adonisjs/lucid/services/db'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import Book from '#modules/library/models/book'
import BookCopy from '#modules/library/models/book_copy'
import Author from '#modules/library/models/author'
import Subject from '#modules/library/models/subject'
import Publisher from '#modules/library/models/publisher'
import Category from '#modules/library/models/category'
import Borrowing from '#modules/library/models/borrowing'
import AuditService, { type AuditContext } from '#modules/library/services/audit/audit_service'
import CatalogVersionService from '#modules/library/services/catalog/catalog_version_service'
import BusinessRuleException from '#modules/library/exceptions/business_rule_exception'
import {
  ACTIVE_BORROWING_STATUSES,
  ACTIVE_CIRCULATION_COPY_STATUSES,
  ULMIS_MATERIAL_TYPES,
  type UlmisClassificationScheme,
  type UlmisMaterialType,
} from '#modules/library/domain/ulmis_catalog'
import {
  buildDublinCore,
  buildSearchText,
  generateBarcode,
  normalizeAuthorityName,
  slugify,
  tenantId,
} from '#modules/library/services/books/book_helpers'
import { scheduleBookReindex, scheduleSearchIndex } from '#modules/library/services/search/search_index_hook'

export interface BookListFilters {
  search?: string
  categoryId?: string
  genre?: string
  isDigital?: boolean
  materialType?: string
  author?: string
  publisher?: string
  subject?: string
  isbn?: string
  classification?: string
  page?: number
  perPage?: number
  sortBy?: 'title' | 'createdAt' | 'publicationYear' | 'materialType'
  sortDir?: 'asc' | 'desc'
}

export interface CreateBookInput {
  title: string
  subtitle?: string
  isbn13?: string
  isbn10?: string
  issn?: string
  catalogBarcode?: string
  genre?: string
  materialType?: UlmisMaterialType
  classificationScheme?: UlmisClassificationScheme | null
  classificationNumber?: string
  publicationYear?: number
  publisherName?: string
  categoryName?: string
  description?: string
  isDigital?: boolean
  coverImageUrl?: string
  authors: string[]
  subjects?: string[]
  marcControlNumber?: string
  marcFields?: Record<string, unknown>
  dublinCore?: Record<string, unknown>
  initialCopies?: number
  shelfLocation?: string
}

export interface UpdateBookInput {
  title?: string
  subtitle?: string | null
  isbn13?: string | null
  isbn10?: string | null
  issn?: string | null
  catalogBarcode?: string | null
  genre?: string | null
  materialType?: UlmisMaterialType
  classificationScheme?: UlmisClassificationScheme | null
  classificationNumber?: string | null
  publicationYear?: number | null
  publisherName?: string | null
  categoryName?: string | null
  description?: string | null
  isDigital?: boolean
  coverImageUrl?: string | null
  authors?: string[]
  subjects?: string[]
  marcControlNumber?: string | null
  marcFields?: Record<string, unknown> | null
  dublinCore?: Record<string, unknown> | null
}

export interface BatchUpdateBookInput {
  ids: string[]
  materialType?: UlmisMaterialType
  genre?: string | null
  categoryName?: string | null
  classificationScheme?: UlmisClassificationScheme | null
  classificationNumber?: string | null
}

export default class BookService {
  constructor(
    private auditService = new AuditService(),
    private versions = new CatalogVersionService()
  ) {}

  async list(filters: BookListFilters) {
    const page = filters.page ?? 1
    const perPage = Math.min(filters.perPage ?? 25, 100)
    const tid = tenantId()
    const sortBy = filters.sortBy ?? 'title'
    const sortDir = filters.sortDir ?? 'asc'

    const query = Book.query()
      .where('tenant_id', tid)
      .whereNull('deleted_at')
      .preload('authors')
      .preload('subjects')
      .preload('publisher')
      .preload('category')
      .withCount('copies', (q) => q.whereNull('deleted_at').as('totalCopies'))
      .withCount('copies', (q) =>
        q.whereNull('deleted_at').where('status', 'available').as('availableCopies')
      )
      .withCount('copies', (q) =>
        q.whereNull('deleted_at').where('status', 'on_loan').as('onLoanCopies')
      )

    if (filters.search) {
      const term = `%${filters.search.toLowerCase()}%`
      query.where((q) => {
        q.whereILike('title', term)
          .orWhereILike('author_names', term)
          .orWhereILike('subject_names', term)
          .orWhereILike('search_text', term)
          .orWhereILike('isbn13', term)
          .orWhereILike('isbn10', term)
          .orWhereILike('issn', term)
          .orWhereILike('catalog_barcode', term)
          .orWhereILike('classification_number', term)
      })
    }

    if (filters.categoryId) query.where('category_id', filters.categoryId)
    if (filters.genre) query.whereILike('genre', filters.genre)
    if (filters.isDigital !== undefined) query.where('is_digital', filters.isDigital)
    if (filters.materialType) query.where('material_type', filters.materialType)
    if (filters.author) query.whereILike('author_names', `%${filters.author}%`)
    if (filters.subject) query.whereILike('subject_names', `%${filters.subject}%`)
    if (filters.publisher) {
      query.whereHas('publisher', (q) => q.whereILike('name', `%${filters.publisher}%`))
    }
    if (filters.isbn) {
      const term = `%${filters.isbn}%`
      query.where((q) => {
        q.whereILike('isbn13', term).orWhereILike('isbn10', term).orWhereILike('issn', term)
      })
    }
    if (filters.classification) {
      query.whereILike('classification_number', `%${filters.classification}%`)
    }

    const sortColumn =
      sortBy === 'createdAt'
        ? 'created_at'
        : sortBy === 'publicationYear'
          ? 'publication_year'
          : sortBy === 'materialType'
            ? 'material_type'
            : 'title'

    return query.orderBy(sortColumn, sortDir).paginate(page, perPage)
  }

  async findById(bookId: string) {
    return Book.query()
      .where('id', bookId)
      .where('tenant_id', tenantId())
      .whereNull('deleted_at')
      .preload('authors')
      .preload('subjects')
      .preload('publisher')
      .preload('category')
      .preload('copies', (q) => q.whereNull('deleted_at').orderBy('copy_number', 'asc'))
      .firstOrFail()
  }

  async create(input: CreateBookInput, auditCtx?: AuditContext) {
    const tid = tenantId()
    this.assertMaterialType(input.materialType ?? 'book')
    this.assertClassification(input.classificationScheme, input.classificationNumber)
    await this.assertUniqueIdentifiers({
      isbn13: input.isbn13,
      catalogBarcode: input.catalogBarcode,
    })

    return db.transaction(async (trx) => {
      const publisherId = input.publisherName
        ? await this.findOrCreatePublisher(input.publisherName, trx)
        : null
      const categoryId = input.categoryName
        ? await this.findOrCreateCategory(input.categoryName, trx)
        : null
      const authorIds = await this.resolveAuthors(input.authors, trx)
      const subjectNames = (input.subjects ?? []).map((s) => s.trim()).filter(Boolean)
      const subjectIds = await this.resolveSubjects(subjectNames, trx)
      const authorNames = input.authors.map((a) => a.trim()).filter(Boolean).join(', ')
      const subjectJoined = subjectNames.join(', ') || null

      const category = categoryId
        ? await Category.query({ client: trx }).where('id', categoryId).first()
        : null
      const publisher = publisherId
        ? await Publisher.query({ client: trx }).where('id', publisherId).first()
        : null

      const materialType = input.materialType ?? 'book'
      const dublinCore =
        input.dublinCore ??
        buildDublinCore({
          title: input.title,
          authorNames,
          subjectNames: subjectJoined,
          publisherName: publisher?.name,
          isbn13: input.isbn13,
          isbn10: input.isbn10,
          issn: input.issn,
          publicationYear: input.publicationYear,
          description: input.description,
          materialType,
        })

      const book = await Book.create(
        {
          tenantId: tid,
          title: input.title,
          subtitle: input.subtitle ?? null,
          isbn13: input.isbn13 ?? null,
          isbn10: input.isbn10 ?? null,
          issn: input.issn ?? null,
          catalogBarcode: input.catalogBarcode ?? null,
          genre: input.genre ?? null,
          materialType,
          classificationScheme: input.classificationScheme ?? null,
          classificationNumber: input.classificationNumber ?? null,
          publicationYear: input.publicationYear ?? null,
          publisherId,
          categoryId,
          description: input.description ?? null,
          isDigital: input.isDigital ?? materialType === 'electronic',
          coverImageUrl: input.coverImageUrl ?? null,
          authorNames,
          subjectNames: subjectJoined,
          marcControlNumber: input.marcControlNumber ?? null,
          marcFields: input.marcFields ?? null,
          dublinCore,
          metadataVersion: 1,
          searchText: buildSearchText({
            title: input.title,
            authorNames,
            subjectNames: subjectJoined,
            isbn13: input.isbn13,
            isbn10: input.isbn10,
            issn: input.issn,
            categoryName: category?.name,
            genre: input.genre,
            publisherName: publisher?.name,
            classificationNumber: input.classificationNumber,
            materialType,
          }),
        },
        { client: trx }
      )

      if (authorIds.length) {
        await book
          .useTransaction(trx)
          .related('authors')
          .attach(Object.fromEntries(authorIds.map((id, i) => [id, { sort_order: i }])))
      }
      if (subjectIds.length) {
        await book
          .useTransaction(trx)
          .related('subjects')
          .attach(Object.fromEntries(subjectIds.map((id, i) => [id, { sort_order: i }])))
      }

      const copyCount = input.initialCopies ?? 1
      for (let i = 0; i < copyCount; i++) {
        await this.createCopyInternal(
          book.id,
          { shelfLocation: input.shelfLocation, copyNumber: i + 1 },
          trx
        )
      }

      await book.load('authors')
      await book.load('subjects')
      await book.load('copies')
      await book.load('publisher')
      await book.load('category')

      await this.versions.record(book, auditCtx?.userId, trx)
      await this.auditService.log(
        'create',
        'book',
        book.id,
        null,
        this.serializeBookSnapshot(book),
        auditCtx
      )

      scheduleBookReindex(book.id, tid)
      return book
    })
  }

  async update(bookId: string, input: UpdateBookInput, auditCtx?: AuditContext) {
    const book = await this.findById(bookId)
    const oldSnapshot = this.serializeBookSnapshot(book)

    if (input.materialType) this.assertMaterialType(input.materialType)
    this.assertClassification(
      input.classificationScheme === undefined
        ? (book.classificationScheme as UlmisClassificationScheme | null)
        : input.classificationScheme,
      input.classificationNumber === undefined
        ? (book.classificationNumber ?? undefined)
        : (input.classificationNumber ?? undefined)
    )
    await this.assertUniqueIdentifiers({
      isbn13: input.isbn13 === undefined ? undefined : input.isbn13,
      catalogBarcode: input.catalogBarcode === undefined ? undefined : input.catalogBarcode,
      excludeBookId: bookId,
    })

    return db.transaction(async (trx) => {
      book.useTransaction(trx)

      if (input.publisherName !== undefined) {
        book.publisherId = input.publisherName
          ? await this.findOrCreatePublisher(input.publisherName, trx)
          : null
      }
      if (input.categoryName !== undefined) {
        book.categoryId = input.categoryName
          ? await this.findOrCreateCategory(input.categoryName, trx)
          : null
      }
      if (input.title !== undefined) book.title = input.title
      if (input.subtitle !== undefined) book.subtitle = input.subtitle
      if (input.isbn13 !== undefined) book.isbn13 = input.isbn13
      if (input.isbn10 !== undefined) book.isbn10 = input.isbn10
      if (input.issn !== undefined) book.issn = input.issn
      if (input.catalogBarcode !== undefined) book.catalogBarcode = input.catalogBarcode
      if (input.genre !== undefined) book.genre = input.genre
      if (input.materialType !== undefined) book.materialType = input.materialType
      if (input.classificationScheme !== undefined) {
        book.classificationScheme = input.classificationScheme
      }
      if (input.classificationNumber !== undefined) {
        book.classificationNumber = input.classificationNumber
      }
      if (input.publicationYear !== undefined) book.publicationYear = input.publicationYear
      if (input.description !== undefined) book.description = input.description
      if (input.isDigital !== undefined) book.isDigital = input.isDigital
      if (input.coverImageUrl !== undefined) book.coverImageUrl = input.coverImageUrl
      if (input.marcControlNumber !== undefined) book.marcControlNumber = input.marcControlNumber
      if (input.marcFields !== undefined) book.marcFields = input.marcFields

      if (input.authors) {
        const authorIds = await this.resolveAuthors(input.authors, trx)
        book.authorNames = input.authors.map((a) => a.trim()).filter(Boolean).join(', ')
        await book.related('authors').sync(
          Object.fromEntries(authorIds.map((id, i) => [id, { sort_order: i }]))
        )
      }

      if (input.subjects) {
        const subjectNames = input.subjects.map((s) => s.trim()).filter(Boolean)
        const subjectIds = await this.resolveSubjects(subjectNames, trx)
        book.subjectNames = subjectNames.join(', ') || null
        await book.related('subjects').sync(
          Object.fromEntries(subjectIds.map((id, i) => [id, { sort_order: i }]))
        )
      }

      await book.load('publisher')
      await book.load('category')

      book.dublinCore =
        input.dublinCore ??
        buildDublinCore({
          title: book.title,
          authorNames: book.authorNames,
          subjectNames: book.subjectNames,
          publisherName: book.publisher?.name,
          isbn13: book.isbn13,
          isbn10: book.isbn10,
          issn: book.issn,
          publicationYear: book.publicationYear,
          description: book.description,
          materialType: book.materialType,
        })

      book.searchText = buildSearchText({
        title: book.title,
        authorNames: book.authorNames,
        subjectNames: book.subjectNames,
        isbn13: book.isbn13,
        isbn10: book.isbn10,
        issn: book.issn,
        categoryName: book.category?.name,
        genre: book.genre,
        publisherName: book.publisher?.name,
        classificationNumber: book.classificationNumber,
        materialType: book.materialType,
      })

      book.metadataVersion = (book.metadataVersion ?? 1) + 1
      await book.save()
      await book.load('authors')
      await book.load('subjects')

      await this.versions.record(book, auditCtx?.userId, trx)
      await this.auditService.log(
        'update',
        'book',
        book.id,
        oldSnapshot,
        this.serializeBookSnapshot(book),
        auditCtx
      )

      scheduleBookReindex(book.id, tenantId())
      return book
    })
  }

  async softDelete(bookId: string, auditCtx?: AuditContext) {
    const book = await this.findById(bookId)
    await this.assertDeletable(bookId)
    const snapshot = this.serializeBookSnapshot(book)

    return db.transaction(async (trx) => {
      book.useTransaction(trx)
      book.deletedAt = DateTime.now()
      await book.save()

      await BookCopy.query({ client: trx })
        .where('book_id', bookId)
        .where('tenant_id', tenantId())
        .whereNull('deleted_at')
        .update({ deleted_at: DateTime.now().toSQL(), status: 'withdrawn' })

      await this.auditService.log('delete', 'book', book.id, snapshot, null, auditCtx)
      scheduleSearchIndex('book', book.id, 'delete', tenantId())
    })
  }

  async batchSoftDelete(ids: string[], auditCtx?: AuditContext) {
    const uniqueIds = [...new Set(ids)]
    const results: Array<{ id: string; ok: boolean; error?: string }> = []

    for (const id of uniqueIds) {
      try {
        await this.softDelete(id, auditCtx)
        results.push({ id, ok: true })
      } catch (error) {
        results.push({
          id,
          ok: false,
          error: error instanceof Error ? error.message : 'Delete failed',
        })
      }
    }

    return results
  }

  async batchUpdate(input: BatchUpdateBookInput, auditCtx?: AuditContext) {
    const results: Array<{ id: string; ok: boolean; error?: string }> = []
    for (const id of [...new Set(input.ids)]) {
      try {
        await this.update(
          id,
          {
            materialType: input.materialType,
            genre: input.genre,
            categoryName: input.categoryName,
            classificationScheme: input.classificationScheme,
            classificationNumber: input.classificationNumber,
          },
          auditCtx
        )
        results.push({ id, ok: true })
      } catch (error) {
        results.push({
          id,
          ok: false,
          error: error instanceof Error ? error.message : 'Update failed',
        })
      }
    }
    return results
  }

  async exportMarc(bookId: string) {
    const book = await this.findById(bookId)
    const fields: Record<string, string> = {
      ...(book.marcFields as Record<string, string> | null),
      '245': book.title,
      '100': book.authorNames ?? '',
      '020': book.isbn13 ?? book.isbn10 ?? '',
      '022': book.issn ?? '',
      '650': book.subjectNames ?? '',
      '260': book.publisher?.name ?? '',
      '082': book.classificationScheme === 'ddc' ? (book.classificationNumber ?? '') : '',
      '050': book.classificationScheme === 'lcc' ? (book.classificationNumber ?? '') : '',
    }

    return {
      controlNumber: book.marcControlNumber ?? book.id,
      materialType: book.materialType,
      dublinCore: book.dublinCore,
      fields,
    }
  }

  async getInventoryStats(bookId: string) {
    const copies = await BookCopy.query()
      .where('book_id', bookId)
      .where('tenant_id', tenantId())
      .whereNull('deleted_at')

    const total = copies.length
    const available = copies.filter((c) => c.status === 'available').length
    const onLoan = copies.filter((c) => c.status === 'on_loan').length
    const reserved = copies.filter((c) => c.status === 'reserved').length
    const maintenance = copies.filter((c) => c.status === 'maintenance').length

    return { total, available, onLoan, reserved, maintenance }
  }

  serializeBook(
    book: Book,
    stats?: {
      total: number
      available: number
      onLoan: number
      reserved: number
      maintenance: number
    }
  ) {
    const extra = book.$extras as Record<string, unknown>

    return {
      id: book.id,
      title: book.title,
      subtitle: book.subtitle,
      isbn13: book.isbn13,
      isbn10: book.isbn10,
      issn: book.issn,
      catalogBarcode: book.catalogBarcode,
      genre: book.genre,
      materialType: book.materialType,
      classificationScheme: book.classificationScheme,
      classificationNumber: book.classificationNumber,
      publicationYear: book.publicationYear,
      description: book.description,
      isDigital: book.isDigital,
      coverImageUrl: book.coverImageUrl,
      authors: book.authors?.map((a) => a.fullName) ?? [],
      subjects: book.subjects?.map((s) => s.name) ?? book.subjectNames?.split(', ').filter(Boolean) ?? [],
      publisher: book.publisher?.name ?? null,
      category: book.category?.name ?? null,
      categoryId: book.categoryId,
      publisherId: book.publisherId,
      marcControlNumber: book.marcControlNumber,
      dublinCore: book.dublinCore,
      metadataVersion: book.metadataVersion,
      quantity: stats?.total ?? Number(extra.totalCopies ?? 0),
      availableCopies: stats?.available ?? Number(extra.availableCopies ?? 0),
      onLoanCopies: stats?.onLoan ?? Number(extra.onLoanCopies ?? 0),
      reservedCopies: stats?.reserved ?? 0,
      maintenanceCopies: stats?.maintenance ?? 0,
      createdAt: book.createdAt.toISO(),
      updatedAt: book.updatedAt?.toISO() ?? null,
    }
  }

  serializeCopy(copy: BookCopy) {
    return {
      id: copy.id,
      bookId: copy.bookId,
      barcode: copy.barcode,
      copyNumber: copy.copyNumber,
      status: copy.status,
      shelfLocation: copy.shelfLocation,
      condition: copy.condition,
      notes: copy.notes,
      createdAt: copy.createdAt.toISO(),
    }
  }

  private serializeBookSnapshot(book: Book) {
    return {
      title: book.title,
      materialType: book.materialType,
      isbn13: book.isbn13,
      issn: book.issn,
      authorNames: book.authorNames,
      subjectNames: book.subjectNames,
      classificationScheme: book.classificationScheme,
      classificationNumber: book.classificationNumber,
      publicationYear: book.publicationYear,
      isDigital: book.isDigital,
      metadataVersion: book.metadataVersion,
    }
  }

  private assertMaterialType(value: string) {
    if (!(ULMIS_MATERIAL_TYPES as readonly string[]).includes(value)) {
      throw new BusinessRuleException(
        `materialType must be one of: ${ULMIS_MATERIAL_TYPES.join(', ')}`
      )
    }
  }

  private assertClassification(
    scheme: UlmisClassificationScheme | null | undefined,
    number: string | null | undefined
  ) {
    if (scheme && scheme !== 'ddc' && scheme !== 'lcc') {
      throw new BusinessRuleException('classificationScheme must be ddc or lcc')
    }
    if (scheme && !number?.trim()) {
      throw new BusinessRuleException('classificationNumber is required when classificationScheme is set')
    }
  }

  private async assertUniqueIdentifiers(opts: {
    isbn13?: string | null
    catalogBarcode?: string | null
    excludeBookId?: string
  }) {
    const tid = tenantId()
    if (opts.isbn13) {
      const query = Book.query()
        .where('tenant_id', tid)
        .where('isbn13', opts.isbn13)
        .whereNull('deleted_at')
      if (opts.excludeBookId) query.whereNot('id', opts.excludeBookId)
      if (await query.first()) {
        throw new BusinessRuleException('A catalog record with this ISBN-13 already exists')
      }
    }
    if (opts.catalogBarcode) {
      const query = Book.query()
        .where('tenant_id', tid)
        .where('catalog_barcode', opts.catalogBarcode)
        .whereNull('deleted_at')
      if (opts.excludeBookId) query.whereNot('id', opts.excludeBookId)
      if (await query.first()) {
        throw new BusinessRuleException('A catalog record with this catalog barcode already exists')
      }
    }
  }

  private async assertDeletable(bookId: string) {
    const tid = tenantId()
    const activeCopy = await BookCopy.query()
      .where('book_id', bookId)
      .where('tenant_id', tid)
      .whereNull('deleted_at')
      .whereIn('status', [...ACTIVE_CIRCULATION_COPY_STATUSES])
      .first()

    if (activeCopy) {
      throw new BusinessRuleException(
        'Cannot delete catalog record linked to active circulation items (on loan or reserved)'
      )
    }

    const activeBorrowing = await Borrowing.query()
      .where('tenant_id', tid)
      .where('book_id', bookId)
      .whereIn('status', [...ACTIVE_BORROWING_STATUSES])
      .first()

    if (activeBorrowing) {
      throw new BusinessRuleException(
        'Cannot delete catalog record linked to active circulation transactions'
      )
    }
  }

  private async findOrCreatePublisher(name: string, trx: TransactionClientContract) {
    const tid = tenantId()
    let publisher = await Publisher.query({ client: trx })
      .where('tenant_id', tid)
      .whereILike('name', name.trim())
      .first()

    if (!publisher) {
      publisher = await Publisher.create({ tenantId: tid, name: name.trim() }, { client: trx })
    }
    return publisher.id
  }

  private async findOrCreateCategory(name: string, trx: TransactionClientContract) {
    const tid = tenantId()
    const slug = slugify(name)
    let category = await Category.query({ client: trx })
      .where('tenant_id', tid)
      .where('slug', slug)
      .first()

    if (!category) {
      category = await Category.create(
        { tenantId: tid, name: name.trim(), slug },
        { client: trx }
      )
    }
    return category.id
  }

  private async resolveAuthors(names: string[], trx: TransactionClientContract) {
    const tid = tenantId()
    const ids: string[] = []
    for (const name of names) {
      const trimmed = name.trim()
      if (!trimmed) continue
      let author = await Author.query({ client: trx })
        .where('tenant_id', tid)
        .whereILike('full_name', trimmed)
        .first()
      if (!author) {
        author = await Author.create({ tenantId: tid, fullName: trimmed }, { client: trx })
      }
      ids.push(author.id)
    }
    return ids
  }

  private async resolveSubjects(names: string[], trx: TransactionClientContract) {
    const tid = tenantId()
    const ids: string[] = []
    for (const name of names) {
      const trimmed = name.trim()
      if (!trimmed) continue
      const normalized = normalizeAuthorityName(trimmed)
      let subject = await Subject.query({ client: trx })
        .where('tenant_id', tid)
        .where('normalized_name', normalized)
        .first()
      if (!subject) {
        subject = await Subject.create(
          { tenantId: tid, name: trimmed, normalizedName: normalized },
          { client: trx }
        )
      }
      ids.push(subject.id)
    }
    return ids
  }

  async createCopyInternal(
    bookId: string,
    opts: { barcode?: string; shelfLocation?: string; copyNumber?: number; condition?: string },
    trx?: TransactionClientContract
  ) {
    const tid = tenantId()
    const maxCopy = await BookCopy.query(trx ? { client: trx } : undefined)
      .where('book_id', bookId)
      .where('tenant_id', tid)
      .max('copy_number as max')
      .first()

    const copyNumber = opts.copyNumber ?? Number(maxCopy?.$extras.max ?? 0) + 1
    const count = await BookCopy.query(trx ? { client: trx } : undefined)
      .where('tenant_id', tid)
      .count('* as total')
      .first()
    const barcode = opts.barcode ?? generateBarcode(tid, Number(count?.$extras.total ?? 0) + 1)

    return BookCopy.create(
      {
        tenantId: tid,
        bookId,
        barcode,
        copyNumber,
        status: 'available',
        shelfLocation: opts.shelfLocation ?? null,
        condition: opts.condition ?? 'good',
      },
      trx ? { client: trx } : undefined
    )
  }
}
