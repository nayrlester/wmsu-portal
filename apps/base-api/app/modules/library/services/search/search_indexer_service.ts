import { DateTime } from 'luxon'
import db from '@adonisjs/lucid/services/db'
import Book from '#modules/library/models/book'
import BookCopy from '#modules/library/models/book_copy'
import Borrowing from '#modules/library/models/borrowing'
import Member from '#modules/library/models/member'
import SearchDocument, { type SearchEntityType } from '#modules/library/models/search_document'
import { buildDocumentVector, searchTenantId } from '#modules/library/services/search/search_helpers'

export interface IndexJobPayload {
  tenantId: string
  entityType: SearchEntityType
  entityId: string
  action?: 'upsert' | 'delete'
}

export default class SearchIndexerService {
  async indexEntity(tenantId: string, entityType: SearchEntityType, entityId: string) {
    switch (entityType) {
      case 'book':
        return this.indexBook(tenantId, entityId)
      case 'member':
        return this.indexMember(tenantId, entityId)
      case 'transaction':
        return this.indexTransaction(tenantId, entityId)
    }
  }

  async deleteEntity(tenantId: string, entityType: SearchEntityType, entityId: string) {
    await SearchDocument.query()
      .where('tenant_id', tenantId)
      .where('entity_type', entityType)
      .where('entity_id', entityId)
      .delete()
  }

  async reindexTenant(tenantId: string) {
    await SearchDocument.query().where('tenant_id', tenantId).delete()

    const books = await Book.query().where('tenant_id', tenantId).whereNull('deleted_at').select('id')
    for (const book of books) {
      await this.indexBook(tenantId, book.id)
    }

    const members = await Member.query()
      .where('tenant_id', tenantId)
      .whereNull('deleted_at')
      .select('id')
    for (const member of members) {
      await this.indexMember(tenantId, member.id)
    }

    const borrowings = await Borrowing.query().where('tenant_id', tenantId).select('id')
    for (const borrowing of borrowings) {
      await this.indexTransaction(tenantId, borrowing.id)
    }

    return {
      books: books.length,
      members: members.length,
      transactions: borrowings.length,
    }
  }

  async reindexCurrentTenant() {
    return this.reindexTenant(searchTenantId())
  }

  private async indexBook(tenantId: string, bookId: string) {
    const book = await Book.query()
      .where('id', bookId)
      .where('tenant_id', tenantId)
      .whereNull('deleted_at')
      .preload('category')
      .first()

    if (!book) {
      await this.deleteEntity(tenantId, 'book', bookId)
      return null
    }

    const totalCopiesResult = await BookCopy.query()
      .where('book_id', bookId)
      .where('tenant_id', tenantId)
      .whereNull('deleted_at')
      .count('* as total')
      .first()

    const availableCopiesResult = await BookCopy.query()
      .where('book_id', bookId)
      .where('tenant_id', tenantId)
      .whereNull('deleted_at')
      .where('status', 'available')
      .count('* as total')
      .first()

    const borrowStats = await Borrowing.query()
      .where('book_id', bookId)
      .where('tenant_id', tenantId)
      .whereIn('status', ['borrowed', 'returned', 'overdue', 'lost'])
      .count('* as total')
      .first()

    const availableCopies = Number(availableCopiesResult?.$extras.total ?? 0)
    const totalCopies = Number(totalCopiesResult?.$extras.total ?? 0)
    const borrowCount = Number(borrowStats?.$extras.total ?? 0)

    const label = book.title
    const subtitle = [book.authorNames, book.genre].filter(Boolean).join(' · ') || null

    const vectorText = buildDocumentVector([
      book.title,
      book.subtitle ?? '',
      book.authorNames ?? '',
      book.isbn13 ?? '',
      book.isbn10 ?? '',
      book.catalogBarcode ?? '',
      book.genre ?? '',
      book.category?.name ?? '',
      book.searchText ?? '',
    ])

    const metadata = {
      genre: book.genre,
      categoryId: book.categoryId,
      categoryName: book.category?.name ?? null,
      availableCopies,
      totalCopies,
      borrowCount,
      createdAt: book.createdAt.toISO(),
      isbn13: book.isbn13,
    }

    return this.upsertDocument(tenantId, 'book', bookId, label, subtitle, vectorText, metadata)
  }

  private async indexMember(tenantId: string, memberId: string) {
    const member = await Member.query()
      .where('id', memberId)
      .where('tenant_id', tenantId)
      .whereNull('deleted_at')
      .first()

    if (!member) {
      await this.deleteEntity(tenantId, 'member', memberId)
      return null
    }

    const label = member.fullName
    const subtitle = member.libraryCardNumber
    const vectorText = buildDocumentVector([
      member.fullName,
      member.email ?? '',
      member.contact ?? '',
      member.department ?? '',
      member.libraryCardNumber,
      member.memberType,
      member.searchText ?? '',
    ])

    const metadata = {
      memberType: member.memberType,
      membershipStatus: member.membershipStatus,
      libraryCardNumber: member.libraryCardNumber,
      createdAt: member.createdAt.toISO(),
    }

    return this.upsertDocument(tenantId, 'member', memberId, label, subtitle, vectorText, metadata)
  }

  private async indexTransaction(tenantId: string, borrowingId: string) {
    const borrowing = await Borrowing.query()
      .where('id', borrowingId)
      .where('tenant_id', tenantId)
      .preload('member')
      .preload('book')
      .first()

    if (!borrowing) {
      await this.deleteEntity(tenantId, 'transaction', borrowingId)
      return null
    }

    const label = borrowing.transactionNumber
    const subtitle = [borrowing.book?.title, borrowing.member?.fullName].filter(Boolean).join(' · ')

    const vectorText = buildDocumentVector([
      borrowing.transactionNumber,
      borrowing.book?.title ?? '',
      borrowing.member?.fullName ?? '',
      borrowing.member?.libraryCardNumber ?? '',
      borrowing.notes ?? '',
    ])

    const metadata = {
      borrowingStatus: borrowing.status,
      bookTitle: borrowing.book?.title ?? null,
      memberName: borrowing.member?.fullName ?? null,
      transactionNumber: borrowing.transactionNumber,
      createdAt: borrowing.createdAt.toISO(),
      dueAt: borrowing.dueAt?.toISO() ?? null,
    }

    return this.upsertDocument(
      tenantId,
      'transaction',
      borrowingId,
      label,
      subtitle || null,
      vectorText,
      metadata
    )
  }

  private async upsertDocument(
    tenantId: string,
    entityType: SearchEntityType,
    entityId: string,
    label: string,
    subtitle: string | null,
    vectorText: string,
    metadata: Record<string, unknown>
  ) {
    const now = DateTime.now()
    const existing = await SearchDocument.query()
      .where('tenant_id', tenantId)
      .where('entity_type', entityType)
      .where('entity_id', entityId)
      .first()

    await db.rawQuery(
      `
      INSERT INTO search_documents (tenant_id, entity_type, entity_id, label, subtitle, search_vector, metadata, indexed_at, created_at)
      VALUES (?, ?, ?, ?, ?, to_tsvector('english', ?), ?::jsonb, ?, ?)
      ON CONFLICT (tenant_id, entity_type, entity_id)
      DO UPDATE SET
        label = EXCLUDED.label,
        subtitle = EXCLUDED.subtitle,
        search_vector = EXCLUDED.search_vector,
        metadata = EXCLUDED.metadata,
        indexed_at = EXCLUDED.indexed_at
      `,
      [
        tenantId,
        entityType,
        entityId,
        label,
        subtitle,
        vectorText,
        JSON.stringify(metadata),
        now.toSQL(),
        existing?.createdAt.toSQL() ?? now.toSQL(),
      ]
    )

    return SearchDocument.query()
      .where('tenant_id', tenantId)
      .where('entity_type', entityType)
      .where('entity_id', entityId)
      .first()
  }
}
