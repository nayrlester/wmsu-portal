import { DateTime } from 'luxon'
import BookCopy, { type BookCopyStatus } from '#modules/library/models/book_copy'
import BookService from '#modules/library/services/books/book_service'
import AuditService, { type AuditContext } from '#modules/library/services/audit/audit_service'
import BusinessRuleException from '#modules/library/exceptions/business_rule_exception'
import { ACTIVE_CIRCULATION_COPY_STATUSES } from '#modules/library/domain/ulmis_catalog'
import { tenantId } from '#modules/library/services/books/book_helpers'
import { scheduleBookReindex } from '#modules/library/services/search/search_index_hook'

export interface CreateCopyInput {
  barcode?: string
  shelfLocation?: string
  condition?: string
  notes?: string
}

export interface UpdateCopyInput {
  barcode?: string
  shelfLocation?: string | null
  status?: BookCopyStatus
  condition?: string | null
  notes?: string | null
}

export default class CopyService {
  constructor(
    private bookService = new BookService(),
    private auditService = new AuditService()
  ) {}

  async listByBook(bookId: string) {
    return BookCopy.query()
      .where('book_id', bookId)
      .where('tenant_id', tenantId())
      .whereNull('deleted_at')
      .orderBy('copy_number', 'asc')
  }

  async findById(copyId: string) {
    return BookCopy.query()
      .where('id', copyId)
      .where('tenant_id', tenantId())
      .whereNull('deleted_at')
      .firstOrFail()
  }

  async create(bookId: string, input: CreateCopyInput, auditCtx?: AuditContext) {
    await this.bookService.findById(bookId)

    const copy = await this.bookService.createCopyInternal(bookId, {
      barcode: input.barcode,
      shelfLocation: input.shelfLocation,
      condition: input.condition,
    })

    if (input.notes) {
      copy.notes = input.notes
      await copy.save()
    }

    await this.auditService.log(
      'create',
      'book_copy',
      copy.id,
      null,
      this.bookService.serializeCopy(copy),
      auditCtx
    )

    scheduleBookReindex(bookId)

    return copy
  }

  async update(copyId: string, input: UpdateCopyInput, auditCtx?: AuditContext) {
    const copy = await this.findById(copyId)
    const oldSnapshot = this.bookService.serializeCopy(copy)

    if (input.barcode !== undefined) copy.barcode = input.barcode
    if (input.shelfLocation !== undefined) copy.shelfLocation = input.shelfLocation
    if (input.status !== undefined) copy.status = input.status
    if (input.condition !== undefined) copy.condition = input.condition
    if (input.notes !== undefined) copy.notes = input.notes

    await copy.save()

    await this.auditService.log(
      'update',
      'book_copy',
      copy.id,
      oldSnapshot,
      this.bookService.serializeCopy(copy),
      auditCtx
    )

    scheduleBookReindex(copy.bookId)

    return copy
  }

  async withdraw(copyId: string, auditCtx?: AuditContext) {
    const copy = await this.findById(copyId)
    if ((ACTIVE_CIRCULATION_COPY_STATUSES as readonly string[]).includes(copy.status)) {
      throw new BusinessRuleException(
        'Cannot withdraw a copy that is on loan or reserved'
      )
    }
    const oldSnapshot = this.bookService.serializeCopy(copy)

    copy.status = 'withdrawn'
    copy.deletedAt = DateTime.now()
    await copy.save()

    await this.auditService.log('delete', 'book_copy', copy.id, oldSnapshot, null, auditCtx)
    scheduleBookReindex(copy.bookId)
  }
}
