import { DateTime } from 'luxon'
import db from '@adonisjs/lucid/services/db'
import Borrowing, { type BorrowingStatus } from '#modules/library/models/borrowing'
import Book from '#modules/library/models/book'
import BookCopy from '#modules/library/models/book_copy'
import Member from '#modules/library/models/member'
import MemberBorrowingHistory from '#modules/library/models/member_borrowing_history'
import BusinessRuleException from '#modules/library/exceptions/business_rule_exception'
import AuditService, { type AuditContext } from '#modules/library/services/audit/audit_service'
import FineService from '#modules/library/services/fines/fine_service'
import CirculationRulesService from '#modules/library/services/borrowing/circulation_rules_service'
import CirculationEventService from '#modules/library/services/borrowing/circulation_event_service'
import LoanRenewal from '#modules/library/models/loan_renewal'
import { BORROWING_DEFAULTS, type CirculationLoanRules } from '#modules/library/services/borrowing/borrowing_settings'
import { borrowingTenantId, generateTransactionNumber } from '#modules/library/services/borrowing/borrowing_helpers'
import { enqueueNotification } from '#modules/library/services/queue/queue_service'
import { NOTIFICATION_EVENTS } from '#modules/library/services/notifications/notification_types'
import {
  scheduleBookReindex,
  scheduleTransactionReindex,
} from '#modules/library/services/search/search_index_hook'

export interface BorrowingListFilters {
  search?: string
  status?: BorrowingStatus
  memberId?: string
  page?: number
  perPage?: number
}

export interface RequestBorrowInput {
  memberId: string
  bookId: string
  copyId?: string
  notes?: string
  /** Preferred loan start date (ISO date or datetime). */
  borrowedAt?: string
  /** Preferred loan due / end date (ISO date or datetime). */
  dueAt?: string
}

export interface DirectCheckoutInput {
  memberId: string
  copyId: string
  notes?: string
  /** Loan start date (ISO date or datetime). Defaults to now. */
  borrowedAt?: string
  /** Loan due / end date (ISO date or datetime). Defaults to start + loan period. */
  dueAt?: string
}

export default class BorrowingService {
  constructor(
    private auditService = new AuditService(),
    private fineService = new FineService(),
    private rulesService = new CirculationRulesService(),
    private events = new CirculationEventService()
  ) {}

  async list(filters: BorrowingListFilters) {
    const page = filters.page ?? 1
    const perPage = Math.min(filters.perPage ?? 25, 100)
    const tid = borrowingTenantId()

    const query = Borrowing.query()
      .where('tenant_id', tid)
      .preload('member')
      .preload('book')
      .preload('copy')

    if (filters.status) query.where('status', filters.status)
    if (filters.memberId) query.where('member_id', filters.memberId)

    if (filters.search) {
      const term = `%${filters.search.toLowerCase()}%`
      query.where((q) => {
        q.whereILike('transaction_number', term).orWhereHas('member', (mq) => {
          mq.whereILike('full_name', term).orWhereILike('library_card_number', term)
        }).orWhereHas('book', (bq) => {
          bq.whereILike('title', term)
        })
      })
    }

    return query.orderBy('created_at', 'desc').paginate(page, perPage)
  }

  async dashboardStats() {
    const tid = borrowingTenantId()
    const counts = await Borrowing.query()
      .where('tenant_id', tid)
      .select('status')
      .count('* as total')
      .groupBy('status')

    const byStatus: Record<string, number> = {}
    for (const row of counts) {
      byStatus[row.status] = Number(row.$extras.total ?? 0)
    }

    const overdueCount = byStatus.overdue ?? 0
    const activeLoans = (byStatus.borrowed ?? 0) + overdueCount
    const pendingRequests = byStatus.requested ?? 0
    const readyForCheckout = byStatus.approved ?? 0

    const start = DateTime.now().startOf('day').toSQL()!
    const end = DateTime.now().endOf('day').toSQL()!
    const dueTodayRow = await Borrowing.query()
      .where('tenant_id', tid)
      .whereIn('status', ['borrowed', 'overdue'])
      .whereNotNull('due_at')
      .whereBetween('due_at', [start, end])
      .count('* as total')
      .first()

    const recent = await Borrowing.query()
      .where('tenant_id', tid)
      .preload('member')
      .preload('book')
      .orderBy('updated_at', 'desc')
      .limit(8)

    const rules = await this.rulesService.ensureSeeded()

    return {
      activeLoans,
      overdueCount,
      dueTodayCount: Number(dueTodayRow?.$extras.total ?? 0),
      pendingRequests,
      readyForCheckout,
      byStatus,
      recentTransactions: recent.map((b) => this.serializeBorrowing(b)),
      loanRules: rules,
    }
  }

  async findById(id: string) {
    return Borrowing.query()
      .where('id', id)
      .where('tenant_id', borrowingTenantId())
      .preload('member')
      .preload('book')
      .preload('copy')
      .firstOrFail()
  }

  async listEvents(borrowingId: string) {
    await this.findById(borrowingId)
    return this.events.listForBorrowing(borrowingId)
  }

  async getLoanRules() {
    return this.rulesService.ensureSeeded()
  }

  async request(input: RequestBorrowInput, auditCtx?: AuditContext) {
    const tid = borrowingTenantId()
    const member = await this.ensureEligibleMember(input.memberId)
    const book = await Book.query()
      .where('id', input.bookId)
      .where('tenant_id', tid)
      .whereNull('deleted_at')
      .firstOrFail()

    if (input.copyId) {
      await this.ensureCopyAvailable(input.copyId, input.bookId)
    }

    const rules = await this.rulesService.getRules()
    const activeCount = await this.countActiveBorrowings(input.memberId)
    if (activeCount >= rules.maxActiveBorrowings) {
      throw new BusinessRuleException(
        `Member has reached the maximum of ${rules.maxActiveBorrowings} active borrowings`
      )
    }

    const transactionNumber = await generateTransactionNumber(tid)
    const loanWindow = this.resolveLoanWindow(input.borrowedAt, input.dueAt, rules.loanPeriodDays)

    const borrowing = await Borrowing.create({
      tenantId: tid,
      transactionNumber,
      memberId: member.id,
      bookId: book.id,
      copyId: input.copyId ?? null,
      status: 'requested',
      requestedAt: DateTime.now(),
      borrowedAt: loanWindow.borrowedAt,
      dueAt: loanWindow.dueAt,
      maxRenewals: rules.maxRenewals,
      notes: input.notes ?? null,
    })

    await this.events.record({
      eventType: 'request',
      borrowingId: borrowing.id,
      bookId: book.id,
      copyId: input.copyId ?? null,
      memberId: member.id,
      actorUserId: auditCtx?.userId ?? null,
      payload: { transactionNumber },
    })

    await this.auditService.log(
      'create',
      'borrowing',
      borrowing.id,
      null,
      this.serializeBorrowing(borrowing),
      auditCtx
    )

    await enqueueNotification({
      tenantId: tid,
      eventType: 'borrowing.requested',
      recipientType: 'staff',
      title: 'New borrow request',
      body: `${member.fullName} requested "${book.title}"`,
      payload: { borrowingId: borrowing.id, memberId: member.id, bookId: book.id },
    })

    scheduleTransactionReindex(borrowing.id, tid)

    return this.findById(borrowing.id)
  }

  async approve(borrowingId: string, copyId: string | undefined, userId: string, auditCtx?: AuditContext) {
    const borrowing = await this.findById(borrowingId)

    if (borrowing.status !== 'requested') {
      throw new BusinessRuleException('Only requested borrowings can be approved')
    }

    const resolvedCopyId = copyId ?? borrowing.copyId
    if (!resolvedCopyId) {
      const available = await this.findAvailableCopy(borrowing.bookId)
      if (!available) {
        throw new BusinessRuleException('No available copies for this book')
      }
      borrowing.copyId = available.id
    } else {
      await this.ensureCopyAvailable(resolvedCopyId, borrowing.bookId)
      borrowing.copyId = resolvedCopyId
    }

    borrowing.status = 'approved'
    borrowing.approvedAt = DateTime.now()
    borrowing.approvedBy = userId
    await borrowing.save()

    await this.auditService.log(
      'update',
      'borrowing',
      borrowing.id,
      { status: 'requested' },
      { status: 'approved', copyId: borrowing.copyId },
      auditCtx
    )

    await enqueueNotification({
      tenantId: borrowing.tenantId,
      eventType: 'borrowing.approved',
      recipientType: 'member',
      recipientId: borrowing.memberId,
      title: 'Borrow request approved',
      body: `Your request for "${borrowing.book.title}" was approved. Visit the desk to check out.`,
      payload: { borrowingId: borrowing.id },
    })

    scheduleTransactionReindex(borrowing.id, borrowing.tenantId)

    return this.findById(borrowing.id)
  }

  async checkout(borrowingId: string, userId: string, auditCtx?: AuditContext) {
    const borrowing = await this.findById(borrowingId)

    if (borrowing.status !== 'approved') {
      throw new BusinessRuleException('Only approved borrowings can be checked out')
    }

    if (!borrowing.copyId) {
      throw new BusinessRuleException('A copy must be assigned before checkout')
    }

    await this.ensureEligibleMember(borrowing.memberId)

    return this.performCheckout(borrowing, userId, auditCtx)
  }

  async directCheckout(input: DirectCheckoutInput, userId: string, auditCtx?: AuditContext) {
    const tid = borrowingTenantId()
    const member = await this.ensureEligibleMember(input.memberId)
    const rules = await this.rulesService.getRules()

    const activeCount = await this.countActiveBorrowings(input.memberId)
    if (activeCount >= rules.maxActiveBorrowings) {
      throw new BusinessRuleException(
        `Member has reached the maximum of ${rules.maxActiveBorrowings} active borrowings`
      )
    }

    const loanWindow = this.resolveLoanWindow(input.borrowedAt, input.dueAt, rules.loanPeriodDays)
    const transactionNumber = await generateTransactionNumber(tid)
    const now = DateTime.now()

    const borrowingId = await db.transaction(async (trx) => {
      const copy = await BookCopy.query({ client: trx })
        .where('id', input.copyId)
        .where('tenant_id', tid)
        .whereNull('deleted_at')
        .forUpdate()
        .firstOrFail()

      if (copy.status !== 'available' && copy.status !== 'reserved') {
        throw new BusinessRuleException('Selected copy is not available')
      }

      const conflict = await Borrowing.query({ client: trx })
        .where('tenant_id', tid)
        .where('copy_id', copy.id)
        .whereIn('status', ['approved', 'borrowed', 'overdue'])
        .first()
      if (conflict) {
        throw new BusinessRuleException('Copy already has an active circulation transaction')
      }

      const borrowing = await Borrowing.create(
        {
          tenantId: tid,
          transactionNumber,
          memberId: member.id,
          bookId: copy.bookId,
          copyId: copy.id,
          status: 'approved',
          requestedAt: now,
          approvedAt: now,
          approvedBy: userId,
          maxRenewals: rules.maxRenewals,
          notes: input.notes ?? null,
        },
        { client: trx }
      )

      await this.persistCheckout(borrowing, userId, rules, loanWindow, trx)
      return borrowing.id
    })

    return this.finalizeCheckout(borrowingId, loanWindow.dueAt, auditCtx)
  }

  async return(borrowingId: string, userId: string, notes?: string, auditCtx?: AuditContext) {
    const borrowing = await this.findById(borrowingId)

    if (!['borrowed', 'overdue'].includes(borrowing.status)) {
      throw new BusinessRuleException('Only active loans can be returned')
    }

    if (!borrowing.copyId || !borrowing.dueAt) {
      throw new BusinessRuleException('Borrowing record is incomplete')
    }

    const returnedAt = DateTime.now()
    const trx = await db.transaction()

    try {
      borrowing.status = 'returned'
      borrowing.returnedAt = returnedAt
      borrowing.returnedBy = userId
      if (notes) borrowing.notes = notes
      borrowing.useTransaction(trx)
      await borrowing.save()

      const copy = await BookCopy.query({ client: trx })
        .where('id', borrowing.copyId)
        .where('tenant_id', borrowing.tenantId)
        .firstOrFail()
      copy.status = 'available'
      copy.useTransaction(trx)
      await copy.save()

      await MemberBorrowingHistory.create(
        {
          tenantId: borrowing.tenantId,
          memberId: borrowing.memberId,
          bookId: borrowing.bookId,
          bookTitle: borrowing.book.title,
          status: 'returned',
          borrowedAt: borrowing.borrowedAt,
          dueAt: borrowing.dueAt,
          returnedAt,
          notes: notes ?? null,
        },
        { client: trx }
      )

      await this.events.record(
        {
          eventType: 'return',
          borrowingId: borrowing.id,
          bookId: borrowing.bookId,
          copyId: borrowing.copyId,
          memberId: borrowing.memberId,
          actorUserId: userId,
          payload: {
            returnedAt: returnedAt.toISO(),
            overdue: returnedAt > borrowing.dueAt!,
          },
        },
        trx
      )

      await trx.commit()
    } catch (error) {
      await trx.rollback()
      throw error
    }

    if (returnedAt > borrowing.dueAt) {
      await this.fineService.assessOverdueFine(borrowing.id, returnedAt)
    }

    await this.auditService.log(
      'update',
      'borrowing',
      borrowing.id,
      { status: 'borrowed' },
      { status: 'returned', returnedAt: returnedAt.toISO() },
      auditCtx
    )

    await enqueueNotification({
      tenantId: borrowing.tenantId,
      eventType: 'borrowing.returned',
      recipientType: 'member',
      recipientId: borrowing.memberId,
      title: 'Book returned',
      body: `"${borrowing.book.title}" was returned successfully.`,
      payload: { borrowingId: borrowing.id },
    })

    scheduleTransactionReindex(borrowing.id, borrowing.tenantId)
    scheduleBookReindex(borrowing.bookId, borrowing.tenantId)

    // Notify reservation queue when a copy becomes available
    const { default: ReservationService } = await import('#modules/library/services/reservations/reservation_service')
    await new ReservationService().onCopyReturned(borrowing.bookId, borrowing.copyId)

    return this.findById(borrowing.id)
  }

  async renew(borrowingId: string, auditCtx?: AuditContext) {
    const borrowing = await this.findById(borrowingId)

    if (!['borrowed', 'overdue'].includes(borrowing.status)) {
      throw new BusinessRuleException('Only active loans can be renewed')
    }

    if (borrowing.status === 'overdue') {
      throw new BusinessRuleException(
        'Overdue loans cannot be renewed. Return the item and clear fines first.'
      )
    }

    await this.ensureEligibleMember(borrowing.memberId, { allowActiveOverdue: false })
    const rules = await this.rulesService.getRules()

    const maxRenewals = borrowing.maxRenewals ?? rules.maxRenewals
    const renewalCount = borrowing.renewalCount ?? 0
    if (renewalCount >= maxRenewals) {
      throw new BusinessRuleException(`Maximum renewals (${maxRenewals}) reached for this loan`)
    }

    const { default: ReservationService } = await import('#modules/library/services/reservations/reservation_service')
    const hasWaitlist = await new ReservationService().hasPendingForBook(borrowing.bookId)
    if (hasWaitlist) {
      throw new BusinessRuleException('Cannot renew while other members are waiting for this title')
    }

    const previousDue = borrowing.dueAt
    const base =
      DateTime.now() > (borrowing.dueAt ?? DateTime.now()) ? DateTime.now() : borrowing.dueAt!
    const newDue = base.plus({ days: rules.renewalPeriodDays })
    const nextNumber = renewalCount + 1

    await db.transaction(async (trx) => {
      borrowing.useTransaction(trx)
      borrowing.renewalCount = nextNumber
      borrowing.dueAt = newDue
      borrowing.status = 'borrowed'
      await borrowing.save()

      await LoanRenewal.create(
        {
          tenantId: borrowing.tenantId,
          borrowingId: borrowing.id,
          renewalNumber: nextNumber,
          previousDueAt: previousDue,
          newDueAt: newDue,
          renewedBy: auditCtx?.userId ?? null,
        },
        { client: trx }
      )

      await this.events.record(
        {
          eventType: 'renew',
          borrowingId: borrowing.id,
          bookId: borrowing.bookId,
          copyId: borrowing.copyId,
          memberId: borrowing.memberId,
          actorUserId: auditCtx?.userId ?? null,
          payload: {
            previousDueAt: previousDue?.toISO() ?? null,
            newDueAt: newDue.toISO(),
            renewalNumber: nextNumber,
          },
        },
        trx
      )
    })

    await this.auditService.log(
      'update',
      'borrowing',
      borrowing.id,
      { dueAt: previousDue?.toISO(), renewalCount },
      { dueAt: newDue.toISO(), renewalCount: nextNumber },
      auditCtx
    )

    await enqueueNotification({
      tenantId: borrowing.tenantId,
      eventType: 'borrowing.renewed',
      recipientType: 'member',
      recipientId: borrowing.memberId,
      title: 'Loan renewed',
      body: `"${borrowing.book.title}" is now due on ${newDue.toFormat('MMM d, yyyy')}.`,
      payload: { borrowingId: borrowing.id, dueAt: newDue.toISO() },
    })

    scheduleTransactionReindex(borrowing.id, borrowing.tenantId)

    return this.findById(borrowing.id)
  }

  async markLost(borrowingId: string, userId: string, auditCtx?: AuditContext) {
    const borrowing = await this.findById(borrowingId)

    if (!['borrowed', 'overdue'].includes(borrowing.status)) {
      throw new BusinessRuleException('Only active loans can be marked as lost')
    }

    if (!borrowing.copyId) {
      throw new BusinessRuleException('Borrowing has no copy assigned')
    }

    const trx = await db.transaction()

    try {
      borrowing.status = 'lost'
      borrowing.lostAt = DateTime.now()
      borrowing.lostReportedBy = userId
      borrowing.useTransaction(trx)
      await borrowing.save()

      const copy = await BookCopy.query({ client: trx })
        .where('id', borrowing.copyId)
        .where('tenant_id', borrowing.tenantId)
        .firstOrFail()
      copy.status = 'lost'
      copy.useTransaction(trx)
      await copy.save()

      await trx.commit()
    } catch (error) {
      await trx.rollback()
      throw error
    }

    await this.fineService.assessLostFine(borrowing.id)

    await this.auditService.log(
      'update',
      'borrowing',
      borrowing.id,
      { status: 'borrowed' },
      { status: 'lost' },
      auditCtx
    )

    await enqueueNotification({
      tenantId: borrowing.tenantId,
      eventType: 'borrowing.lost',
      recipientType: 'member',
      recipientId: borrowing.memberId,
      title: 'Book marked as lost',
      body: `"${borrowing.book.title}" was reported lost. A replacement fine may apply.`,
      payload: { borrowingId: borrowing.id },
    })

    scheduleTransactionReindex(borrowing.id, borrowing.tenantId)
    scheduleBookReindex(borrowing.bookId, borrowing.tenantId)

    return this.findById(borrowing.id)
  }

  async processOverdueBorrowings(tenantId?: string) {
    const now = DateTime.now()
    const query = Borrowing.query()
      .where('status', 'borrowed')
      .whereNotNull('due_at')
      .where('due_at', '<', now.toSQL()!)
      .preload('member')
      .preload('book')

    if (tenantId) query.where('tenant_id', tenantId)

    const overdueItems = await query
    let processed = 0

    for (const borrowing of overdueItems) {
      borrowing.status = 'overdue'
      await borrowing.save()

      scheduleTransactionReindex(borrowing.id, borrowing.tenantId)

      await enqueueNotification({
        tenantId: borrowing.tenantId,
        eventType: NOTIFICATION_EVENTS.OVERDUE_NOTICE,
        recipientType: 'member',
        recipientId: borrowing.memberId,
        title: 'Overdue book',
        body: `"${borrowing.book.title}" is overdue. Please return it as soon as possible.`,
        payload: { borrowingId: borrowing.id, dueAt: borrowing.dueAt?.toISO() },
      })

      processed++
    }

    return { processed }
  }

  serializeBorrowing(borrowing: Borrowing) {
    return {
      id: borrowing.id,
      transactionNumber: borrowing.transactionNumber,
      memberId: borrowing.memberId,
      memberName: borrowing.member?.fullName,
      memberCardNumber: borrowing.member?.libraryCardNumber,
      bookId: borrowing.bookId,
      bookTitle: borrowing.book?.title,
      copyId: borrowing.copyId,
      copyBarcode: borrowing.copy?.barcode,
      status: borrowing.status,
      requestedAt: borrowing.requestedAt.toISO(),
      approvedAt: borrowing.approvedAt?.toISO() ?? null,
      borrowedAt: borrowing.borrowedAt?.toISO() ?? null,
      dueAt: borrowing.dueAt?.toISO() ?? null,
      returnedAt: borrowing.returnedAt?.toISO() ?? null,
      lostAt: borrowing.lostAt?.toISO() ?? null,
      notes: borrowing.notes,
      renewalCount: borrowing.renewalCount ?? 0,
      maxRenewals: borrowing.maxRenewals ?? BORROWING_DEFAULTS.maxRenewals,
      createdAt: borrowing.createdAt.toISO(),
    }
  }

  private async persistCheckout(
    borrowing: Borrowing,
    userId: string,
    rules: CirculationLoanRules,
    loanWindow: { borrowedAt: DateTime; dueAt: DateTime },
    trx: import('@adonisjs/lucid/types/database').TransactionClientContract
  ) {
    if (!borrowing.copyId) {
      throw new BusinessRuleException('A copy must be assigned before checkout')
    }

    const copy = await BookCopy.query({ client: trx })
      .where('id', borrowing.copyId)
      .where('tenant_id', borrowing.tenantId)
      .whereNull('deleted_at')
      .forUpdate()
      .firstOrFail()

    if (copy.status !== 'available' && copy.status !== 'reserved') {
      throw new BusinessRuleException('Copy is not available for checkout')
    }

    borrowing.useTransaction(trx)
    borrowing.status = 'borrowed'
    borrowing.borrowedAt = loanWindow.borrowedAt
    borrowing.dueAt = loanWindow.dueAt
    borrowing.checkedOutBy = userId
    if (!borrowing.maxRenewals) borrowing.maxRenewals = rules.maxRenewals
    await borrowing.save()

    copy.status = 'on_loan'
    copy.useTransaction(trx)
    await copy.save()

    await this.events.record(
      {
        eventType: 'checkout',
        borrowingId: borrowing.id,
        bookId: borrowing.bookId,
        copyId: borrowing.copyId,
        memberId: borrowing.memberId,
        actorUserId: userId,
        payload: {
          borrowedAt: loanWindow.borrowedAt.toISO(),
          dueAt: loanWindow.dueAt.toISO(),
          loanPeriodDays: rules.loanPeriodDays,
        },
      },
      trx
    )
  }

  private async finalizeCheckout(
    borrowingId: string,
    dueAt: DateTime,
    auditCtx?: AuditContext
  ) {
    await this.auditService.log(
      'update',
      'borrowing',
      borrowingId,
      { status: 'approved' },
      { status: 'borrowed', dueAt: dueAt.toISO() },
      auditCtx
    )

    const refreshed = await this.findById(borrowingId)

    await enqueueNotification({
      tenantId: refreshed.tenantId,
      eventType: 'borrowing.checked_out',
      recipientType: 'member',
      recipientId: refreshed.memberId,
      title: 'Book checked out',
      body: `"${refreshed.book.title}" is due on ${dueAt.toFormat('MMM d, yyyy')}.`,
      payload: { borrowingId: refreshed.id, dueAt: dueAt.toISO() },
    })

    scheduleTransactionReindex(refreshed.id, refreshed.tenantId)
    scheduleBookReindex(refreshed.bookId, refreshed.tenantId)

    return refreshed
  }

  private async performCheckout(
    borrowing: Borrowing,
    userId: string,
    auditCtx?: AuditContext,
    loanWindow?: { borrowedAt: DateTime; dueAt: DateTime }
  ) {
    if (!borrowing.copyId) {
      throw new BusinessRuleException('A copy must be assigned before checkout')
    }

    const rules = await this.rulesService.getRules()
    const borrowedAt = loanWindow?.borrowedAt ?? borrowing.borrowedAt ?? DateTime.now()
    const dueAt =
      loanWindow?.dueAt ??
      borrowing.dueAt ??
      borrowedAt.plus({ days: rules.loanPeriodDays })
    const window = { borrowedAt, dueAt }

    await db.transaction(async (trx) => {
      await this.persistCheckout(borrowing, userId, rules, window, trx)
    })

    return this.finalizeCheckout(borrowing.id, dueAt, auditCtx)
  }

  private resolveLoanWindow(
    borrowedAtRaw?: string,
    dueAtRaw?: string,
    loanPeriodDays: number = BORROWING_DEFAULTS.loanPeriodDays
  ) {
    const borrowedAt = borrowedAtRaw
      ? this.parseLoanDate(borrowedAtRaw, 'start')
      : DateTime.now()

    const dueAt = dueAtRaw
      ? this.parseLoanDate(dueAtRaw, 'end')
      : borrowedAt.plus({ days: loanPeriodDays })

    if (!dueAt.isValid || !borrowedAt.isValid) {
      throw new BusinessRuleException('Invalid loan start or end date')
    }

    if (dueAt <= borrowedAt) {
      throw new BusinessRuleException('Due date must be after the borrow start date')
    }

    return { borrowedAt, dueAt }
  }

  private parseLoanDate(value: string, bound: 'start' | 'end') {
    const trimmed = value.trim()
    const dateOnly = DateTime.fromISO(trimmed, { zone: 'local' })
    if (!dateOnly.isValid) {
      throw new BusinessRuleException(`Invalid ${bound === 'start' ? 'start' : 'due'} date`)
    }

    // Date-only inputs (YYYY-MM-DD) should cover the full calendar day.
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      return bound === 'start' ? dateOnly.startOf('day') : dateOnly.endOf('day')
    }

    return dateOnly
  }

  /**
   * ULMIS borrowing blocks:
   * 1) not enrolled / inactive academic status
   * 2) blacklisted
   * 3) overdue books
   * 4) unpaid charges
   * 5) suspended / expired membership
   */
  private async ensureEligibleMember(
    memberId: string,
    options: { allowActiveOverdue?: boolean } = {}
  ) {
    const member = await Member.query()
      .where('id', memberId)
      .where('tenant_id', borrowingTenantId())
      .whereNull('deleted_at')
      .firstOrFail()

    if (member.membershipStatus === 'suspended') {
      throw new BusinessRuleException('Member is suspended and cannot borrow')
    }

    if (member.membershipStatus === 'expired') {
      throw new BusinessRuleException('Membership has expired')
    }

    if (member.membershipStatus !== 'approved') {
      throw new BusinessRuleException('Member must have approved membership to borrow')
    }

    if (member.isBlacklisted) {
      throw new BusinessRuleException('Member is banned or blacklisted and cannot borrow')
    }

    if (member.isEnrolled === false) {
      throw new BusinessRuleException('Student is not currently enrolled and cannot borrow')
    }

    if (member.academicStatus && ['inactive', 'not_enrolled', 'graduated_blocked'].includes(member.academicStatus)) {
      throw new BusinessRuleException('Member academic status does not allow borrowing')
    }

    if (member.membershipExpiresAt && member.membershipExpiresAt < DateTime.now()) {
      throw new BusinessRuleException('Membership has expired')
    }

    if (!options.allowActiveOverdue) {
      const overdueCount = await Borrowing.query()
        .where('tenant_id', borrowingTenantId())
        .where('member_id', memberId)
        .where('status', 'overdue')
        .count('* as total')
        .first()

      if (Number(overdueCount?.$extras.total ?? 0) > 0) {
        throw new BusinessRuleException('Member has overdue books and cannot borrow')
      }
    }

    if (await this.fineService.hasBlockingFines(memberId)) {
      throw new BusinessRuleException('Member has unpaid charges or penalties and cannot borrow')
    }

    return member
  }

  private async ensureCopyAvailable(copyId: string, bookId: string) {
    const copy = await BookCopy.query()
      .where('id', copyId)
      .where('book_id', bookId)
      .where('tenant_id', borrowingTenantId())
      .whereNull('deleted_at')
      .firstOrFail()

    if (copy.status !== 'available') {
      throw new BusinessRuleException('Selected copy is not available')
    }

    return copy
  }

  private async findAvailableCopy(bookId: string) {
    return BookCopy.query()
      .where('book_id', bookId)
      .where('tenant_id', borrowingTenantId())
      .where('status', 'available')
      .whereNull('deleted_at')
      .orderBy('copy_number', 'asc')
      .first()
  }

  private async countActiveBorrowings(memberId: string) {
    const result = await Borrowing.query()
      .where('tenant_id', borrowingTenantId())
      .where('member_id', memberId)
      .whereIn('status', ['requested', 'approved', 'borrowed', 'overdue'])
      .count('* as total')
      .first()

    return Number(result?.$extras.total ?? 0)
  }
}
