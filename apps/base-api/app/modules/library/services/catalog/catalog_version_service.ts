import { DateTime } from 'luxon'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import Book from '#modules/library/models/book'
import CatalogRecordVersion from '#modules/library/models/catalog_record_version'
import { tenantId } from '#modules/library/services/books/book_helpers'

export default class CatalogVersionService {
  snapshotFromBook(book: Book) {
    return {
      title: book.title,
      subtitle: book.subtitle,
      materialType: book.materialType,
      isbn13: book.isbn13,
      isbn10: book.isbn10,
      issn: book.issn,
      authorNames: book.authorNames,
      subjectNames: book.subjectNames,
      publisherId: book.publisherId,
      categoryId: book.categoryId,
      classificationScheme: book.classificationScheme,
      classificationNumber: book.classificationNumber,
      publicationYear: book.publicationYear,
      genre: book.genre,
      description: book.description,
      isDigital: book.isDigital,
      marcControlNumber: book.marcControlNumber,
      marcFields: book.marcFields,
      dublinCore: book.dublinCore,
      metadataVersion: book.metadataVersion,
    }
  }

  async record(
    book: Book,
    changedBy: string | null | undefined,
    trx?: TransactionClientContract
  ) {
    const tid = tenantId()
    return CatalogRecordVersion.create(
      {
        tenantId: tid,
        bookId: book.id,
        version: book.metadataVersion,
        snapshot: this.snapshotFromBook(book),
        changedBy: changedBy ?? null,
        createdAt: DateTime.now(),
      },
      trx ? { client: trx } : undefined
    )
  }

  async listForBook(bookId: string) {
    return CatalogRecordVersion.query()
      .where('tenant_id', tenantId())
      .where('book_id', bookId)
      .orderBy('version', 'desc')
  }
}
