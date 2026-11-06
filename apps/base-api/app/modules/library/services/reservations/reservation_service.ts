import { DateTime } from 'luxon'
import Reservation from '#modules/library/models/reservation'
import Book from '#modules/library/models/book'
import BookCopy from '#modules/library/models/book_copy'
import Member from '#modules/library/models/member'
import BusinessRuleException from '#modules/library/exceptions/business_rule_exception'
import AuditService, { type AuditContext } from '#modules/library/services/audit/audit_service'
import { borrowingTenantId } from '#modules/library/services/borrowing/borrowing_helpers'
import { enqueueNotification } from '#modules/library/services/queue/queue_service'
import { NOTIFICATION_EVENTS } from '#modules/library/services/notifications/notification_types'

export interface ReservationListFilters {
  status?: Reservation['status']
  memberId?: string
  bookId?: string
  page?: number
  perPage?: number
}

export interface CreateReservationOptions {
  reservedAt?: string
  expiresAt?: string
}

export default class ReservationService {
  constructor(private auditService = new AuditService()) {}

  async list(filters: ReservationListFilters) {
    const page = filters.page ?? 1
    const perPage = Math.min(filters.perPage ?? 25, 100)
    const tid = borrowingTenantId()

    const query = Reservation.query().where('tenant_id', tid)

    if (filters.status) query.where('status', filters.status)
    if (filters.memberId) query.where('member_id', filters.memberId)
    if (filters.bookId) query.where('book_id', filters.bookId)

    return query
      .preload('member')
      .preload('book')
      .orderBy('queue_position', 'asc')
      .orderBy('reserved_at', 'asc')
      .paginate(page, perPage)
  }

  async findById(id: string) {
    return Reservation.query()
      .where('id', id)
      .where('tenant_id', borrowingTenantId())
      .firstOrFail()
  }

  async hasPendingForBook(bookId: string) {
    const result = await Reservation.query()
      .where('tenant_id', borrowingTenantId())
      .where('book_id', bookId)
      .whereIn('status', ['pending', 'ready'])
      .count('* as total')
      .first()

    return Number(result?.$extras.total ?? 0) > 0
  }

  async create(
    memberId: string,
    bookId: string,
    auditCtx?: AuditContext,
    options: CreateReservationOptions = {}
  ) {
    const tid = borrowingTenantId()

    const member = await Member.query()
      .where('id', memberId)
      .where('tenant_id', tid)
      .whereNull('deleted_at')
      .firstOrFail()

    if (member.membershipStatus !== 'approved' || member.isBlacklisted || member.isEnrolled === false) {
      throw new BusinessRuleException('Member is not eligible to reserve materials')
    }

    const book = await Book.query()
      .where('id', bookId)
      .where('tenant_id', tid)
      .whereNull('deleted_at')
      .firstOrFail()

    const existing = await Reservation.query()
      .where('tenant_id', tid)
      .where('member_id', memberId)
      .where('book_id', bookId)
      .whereIn('status', ['pending', 'ready'])
      .first()

    if (existing) {
      throw new BusinessRuleException('Member already has an active reservation for this book')
    }

    const queueTail = await Reservation.query()
      .where('tenant_id', tid)
      .where('book_id', bookId)
      .whereIn('status', ['pending', 'ready'])
      .count('* as total')
      .first()

    const queuePosition = Number(queueTail?.$extras.total ?? 0) + 1
    const window = this.resolveHoldWindow(options.reservedAt, options.expiresAt)

    const reservation = await Reservation.create({
      tenantId: tid,
      memberId,
      bookId: book.id,
      copyId: null,
      status: 'pending',
      queuePosition,
      reservedAt: window.reservedAt,
      readyAt: null,
      expiresAt: window.expiresAt,
      fulfilledAt: null,
      cancelledAt: null,
      cancelReason: null,
    })

    await this.auditService.log(
      'create',
      'reservation',
      reservation.id,
      null,
      this.serialize(reservation, book.title),
      auditCtx
    )

    // If a copy is free, mark ready immediately
    await this.promoteNextForBook(bookId)

    return this.findById(reservation.id)
  }

  async cancel(id: string, reason?: string, auditCtx?: AuditContext) {
    const reservation = await this.findById(id)

    if (!['pending', 'ready'].includes(reservation.status)) {
      throw new BusinessRuleException('Only pending or ready reservations can be cancelled')
    }

    reservation.status = 'cancelled'
    reservation.cancelledAt = DateTime.now()
    reservation.cancelReason = reason ?? 'Cancelled by user'
    await reservation.save()

    if (reservation.copyId) {
      const copy = await BookCopy.find(reservation.copyId)
      if (copy && copy.status === 'reserved') {
        copy.status = 'available'
        await copy.save()
      }
    }

    await this.resequenceQueue(reservation.bookId)
    await this.promoteNextForBook(reservation.bookId)

    await this.auditService.log(
      'update',
      'reservation',
      reservation.id,
      { status: 'pending' },
      { status: 'cancelled', reason },
      auditCtx
    )

    return reservation
  }

  async fulfill(id: string, auditCtx?: AuditContext) {
    const reservation = await this.findById(id)

    if (reservation.status !== 'ready') {
      throw new BusinessRuleException('Only ready reservations can be fulfilled')
    }

    reservation.status = 'fulfilled'
    reservation.fulfilledAt = DateTime.now()
    await reservation.save()

    await this.resequenceQueue(reservation.bookId)

    await this.auditService.log(
      'update',
      'reservation',
      reservation.id,
      { status: 'ready' },
      { status: 'fulfilled' },
      auditCtx
    )

    return reservation
  }

  /** Called when a copy is returned — promote next waiter. */
  async onCopyReturned(bookId: string, _copyId: string | null) {
    await this.promoteNextForBook(bookId)
  }

  async promoteNextForBook(bookId: string) {
    const tid = borrowingTenantId()

    const availableCopy = await BookCopy.query()
      .where('tenant_id', tid)
      .where('book_id', bookId)
      .where('status', 'available')
      .whereNull('deleted_at')
      .orderBy('copy_number', 'asc')
      .first()

    if (!availableCopy) return null

    const next = await Reservation.query()
      .where('tenant_id', tid)
      .where('book_id', bookId)
      .where('status', 'pending')
      .orderBy('queue_position', 'asc')
      .orderBy('reserved_at', 'asc')
      .first()

    if (!next) return null

    availableCopy.status = 'reserved'
    await availableCopy.save()

    next.status = 'ready'
    next.copyId = availableCopy.id
    next.readyAt = DateTime.now()
    // Keep staff-set hold end date when still valid; otherwise give a 3-day pickup window.
    if (!next.expiresAt || next.expiresAt <= DateTime.now()) {
      next.expiresAt = DateTime.now().plus({ days: 3 })
    }
    await next.save()

    const book = await Book.find(bookId)
    const title = book?.title?.trim() || 'A reserved title'
    const pickupBy = next.expiresAt?.toFormat('MMM d, yyyy')
    await enqueueNotification({
      tenantId: tid,
      eventType: NOTIFICATION_EVENTS.RESERVATION_READY,
      recipientType: 'member',
      recipientId: next.memberId,
      title: 'Reservation ready',
      body: pickupBy
        ? `"${title}" is ready for pickup through ${pickupBy}.`
        : `"${title}" is ready for pickup.`,
      payload: { reservationId: next.id, bookId, copyId: availableCopy.id },
    })

    return next
  }

  private async resequenceQueue(bookId: string) {
    const pending = await Reservation.query()
      .where('tenant_id', borrowingTenantId())
      .where('book_id', bookId)
      .whereIn('status', ['pending', 'ready'])
      .orderBy('reserved_at', 'asc')

    let position = 1
    for (const reservation of pending) {
      reservation.queuePosition = position++
      await reservation.save()
    }
  }

  serialize(reservation: Reservation, bookTitle?: string, memberName?: string) {
    return {
      id: reservation.id,
      memberId: reservation.memberId,
      memberName: memberName ?? reservation.member?.fullName ?? null,
      bookId: reservation.bookId,
      bookTitle: bookTitle ?? reservation.book?.title ?? null,
      copyId: reservation.copyId,
      status: reservation.status,
      queuePosition: reservation.queuePosition,
      reservedAt: reservation.reservedAt.toISO(),
      readyAt: reservation.readyAt?.toISO() ?? null,
      expiresAt: reservation.expiresAt?.toISO() ?? null,
      fulfilledAt: reservation.fulfilledAt?.toISO() ?? null,
      cancelledAt: reservation.cancelledAt?.toISO() ?? null,
      cancelReason: reservation.cancelReason,
    }
  }

  async serializeWithRelations(reservation: Reservation) {
    const book =
      reservation.$preloaded.book !== undefined
        ? reservation.book
        : await Book.find(reservation.bookId)
    const member =
      reservation.$preloaded.member !== undefined
        ? reservation.member
        : await Member.find(reservation.memberId)
    return this.serialize(reservation, book?.title, member?.fullName)
  }

  private resolveHoldWindow(reservedAtRaw?: string, expiresAtRaw?: string) {
    const reservedAt = reservedAtRaw
      ? this.parseHoldDate(reservedAtRaw, 'start')
      : DateTime.now()

    const expiresAt = expiresAtRaw
      ? this.parseHoldDate(expiresAtRaw, 'end')
      : reservedAt.plus({ days: 7 })

    if (!reservedAt.isValid || !expiresAt.isValid) {
      throw new BusinessRuleException('Invalid reservation start or end date')
    }

    if (expiresAt <= reservedAt) {
      throw new BusinessRuleException('End date must be after the start date')
    }

    return { reservedAt, expiresAt }
  }

  private parseHoldDate(value: string, bound: 'start' | 'end') {
    const trimmed = value.trim()
    const parsed = DateTime.fromISO(trimmed, { zone: 'local' })
    if (!parsed.isValid) {
      throw new BusinessRuleException(
        `Invalid reservation ${bound === 'start' ? 'start' : 'end'} date`
      )
    }

    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      return bound === 'start' ? parsed.startOf('day') : parsed.endOf('day')
    }

    return parsed
  }
}
