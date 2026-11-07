import { DateTime } from 'luxon'
import Member from '#modules/library/models/member'
import Borrowing from '#modules/library/models/borrowing'
import Reservation from '#modules/library/models/reservation'
import ReadingList from '#modules/library/models/reading_list'
import ReadingListItem from '#modules/library/models/reading_list_item'
import Book from '#modules/library/models/book'
import FineService from '#modules/library/services/fines/fine_service'
import BorrowingService from '#modules/library/services/borrowing/borrowing_service'
import ReservationService from '#modules/library/services/reservations/reservation_service'
import BusinessRuleException from '#modules/library/exceptions/business_rule_exception'
import { borrowingTenantId } from '#modules/library/services/borrowing/borrowing_helpers'
import {
  buildMemberSearchText,
  buildQrPayload,
  generateLibraryCardNumber,
} from '#modules/library/services/members/member_helpers'
import { tenantContext } from '#modules/library/services/tenant/tenant_context'
import type { AuditContext } from '#modules/library/services/audit/audit_service'

export default class PortalService {
  constructor(
    private fineService = new FineService(),
    private borrowingService = new BorrowingService(),
    private reservationService = new ReservationService()
  ) {}

  async resolveMemberForUser(
    userId: string,
    email?: string | null,
    opts?: { fullName?: string | null; roles?: string[]; autoProvisionStudent?: boolean }
  ) {
    const tid = borrowingTenantId()
    const normalizedEmail = email?.trim().toLowerCase() || null
    if (normalizedEmail) {
      const byEmail = await Member.query()
        .where('tenant_id', tid)
        .whereNull('deleted_at')
        .whereILike('email', normalizedEmail)
        .first()
      if (byEmail) return byEmail
    }

    const roles = opts?.roles ?? []
    const isStudent = roles.some((role) => role.toLowerCase() === 'student' || role.toLowerCase() === 'member')
    if (opts?.autoProvisionStudent !== false && isStudent && normalizedEmail) {
      const softDeleted = await Member.query()
        .where('tenant_id', tid)
        .whereILike('email', normalizedEmail)
        .whereNotNull('deleted_at')
        .orderBy('created_at', 'desc')
        .first()
      if (softDeleted) {
        const fullName = (opts?.fullName?.trim() || softDeleted.fullName || normalizedEmail.split('@')[0]).slice(
          0,
          200
        )
        softDeleted.deletedAt = null
        softDeleted.fullName = fullName
        softDeleted.membershipStatus = 'approved'
        softDeleted.isEnrolled = true
        softDeleted.isBlacklisted = false
        softDeleted.approvedAt = softDeleted.approvedAt ?? DateTime.now()
        softDeleted.approvedBy = softDeleted.approvedBy ?? userId
        softDeleted.searchText = buildMemberSearchText({
          fullName,
          email: normalizedEmail,
          libraryCardNumber: softDeleted.libraryCardNumber,
          memberType: softDeleted.memberType || 'student',
        })
        await softDeleted.save()
        return softDeleted
      }

      const fullName = (opts?.fullName?.trim() || normalizedEmail.split('@')[0] || 'Library member').slice(
        0,
        200
      )
      const count = await Member.query().where('tenant_id', tid).count('* as total').first()
      const libraryCardNumber = generateLibraryCardNumber(tid, Number(count?.$extras.total ?? 0) + 1)
      const member = await Member.create({
        tenantId: tid,
        fullName,
        email: normalizedEmail,
        contact: null,
        department: null,
        memberType: 'student',
        membershipStatus: 'approved',
        libraryCardNumber,
        notes: `Auto-linked from platform login ${userId}`,
        isBlacklisted: false,
        isEnrolled: true,
        academicStatus: null,
        approvedAt: DateTime.now(),
        approvedBy: userId,
        searchText: buildMemberSearchText({
          fullName,
          email: normalizedEmail,
          libraryCardNumber,
          memberType: 'student',
        }),
      })
      return member
    }

    throw new BusinessRuleException(
      'No library member profile is linked to this user. Contact the library desk.'
    )
  }

  async accountStatus(member: Member) {
    const loans = await Borrowing.query()
      .where('tenant_id', member.tenantId)
      .where('member_id', member.id)
      .whereIn('status', ['borrowed', 'overdue', 'approved', 'requested'])
      .preload('book')

    const reservations = await Reservation.query()
      .where('tenant_id', member.tenantId)
      .where('member_id', member.id)
      .whereIn('status', ['pending', 'ready'])

    const fines = await this.fineService.getBlockingFines(member.id)

    return {
      member: {
        id: member.id,
        fullName: member.fullName,
        email: member.email,
        libraryCardNumber: member.libraryCardNumber,
        memberType: member.memberType,
        membershipStatus: member.membershipStatus,
        isBlacklisted: member.isBlacklisted,
        isEnrolled: member.isEnrolled,
        membershipExpiresAt: member.membershipExpiresAt?.toISO() ?? null,
      },
      activeLoans: loans.map((b) => this.borrowingService.serializeBorrowing(b)),
      reservations: await Promise.all(
        reservations.map((r) => this.reservationService.serializeWithRelations(r))
      ),
      outstandingFines: fines,
      canBorrow:
        member.membershipStatus === 'approved' &&
        !member.isBlacklisted &&
        member.isEnrolled !== false &&
        fines.length === 0 &&
        !loans.some((l) => l.status === 'overdue'),
    }
  }

  async renewLoan(memberId: string, borrowingId: string, auditCtx?: AuditContext) {
    const borrowing = await this.borrowingService.findById(borrowingId)
    if (borrowing.memberId !== memberId) {
      throw new BusinessRuleException('Loan does not belong to this member')
    }
    return this.borrowingService.renew(borrowingId, auditCtx)
  }

  async serializeLoan(borrowing: Borrowing) {
    return this.borrowingService.serializeBorrowing(borrowing)
  }

  async libraryCard(member: Member) {
    if (member.membershipStatus !== 'approved') {
      throw new BusinessRuleException('Library card is available after membership approval.')
    }
    const tenant = tenantContext.get()
    return {
      fullName: member.fullName,
      libraryCardNumber: member.libraryCardNumber,
      memberType: member.memberType,
      department: member.department,
      tenantName: tenant.name,
      qrPayload: buildQrPayload(tenant.slug, member.libraryCardNumber, member.id),
    }
  }

  async reserve(memberId: string, bookId: string, auditCtx?: AuditContext) {
    const reservation = await this.reservationService.create(memberId, bookId, auditCtx)
    return this.reservationService.serializeWithRelations(reservation)
  }

  async cancelReservation(memberId: string, reservationId: string, auditCtx?: AuditContext) {
    const reservation = await this.reservationService.findById(reservationId)
    if (reservation.memberId !== memberId) {
      throw new BusinessRuleException('Hold does not belong to this member')
    }
    const cancelled = await this.reservationService.cancel(
      reservationId,
      'Cancelled from the OPAC',
      auditCtx
    )
    return this.reservationService.serializeWithRelations(cancelled)
  }

  async listReadingLists(memberId: string) {
    const lists = await ReadingList.query()
      .where('tenant_id', borrowingTenantId())
      .where('member_id', memberId)
      .orderBy('created_at', 'desc')

    return Promise.all(lists.map((list) => this.serializeList(list)))
  }

  async createReadingList(memberId: string, name: string, description?: string) {
    const list = await ReadingList.create({
      tenantId: borrowingTenantId(),
      memberId,
      name,
      description: description ?? null,
      isPublic: false,
      createdAt: DateTime.now(),
    })
    return this.serializeList(list)
  }

  async addReadingListItem(memberId: string, listId: string, bookId: string) {
    const list = await ReadingList.query()
      .where('id', listId)
      .where('member_id', memberId)
      .where('tenant_id', borrowingTenantId())
      .firstOrFail()

    await Book.query()
      .where('id', bookId)
      .where('tenant_id', borrowingTenantId())
      .whereNull('deleted_at')
      .firstOrFail()

    const existing = await ReadingListItem.query()
      .where('reading_list_id', list.id)
      .where('book_id', bookId)
      .first()

    if (existing) return this.serializeList(list)

    const count = await ReadingListItem.query().where('reading_list_id', list.id).count('* as total').first()

    await ReadingListItem.create({
      readingListId: list.id,
      bookId,
      position: Number(count?.$extras.total ?? 0) + 1,
      createdAt: DateTime.now(),
    })

    return this.serializeList(list)
  }

  async deleteReadingList(memberId: string, listId: string) {
    const list = await ReadingList.query()
      .where('id', listId)
      .where('member_id', memberId)
      .where('tenant_id', borrowingTenantId())
      .firstOrFail()

    await list.delete()
  }

  async removeReadingListItem(memberId: string, listId: string, itemId: string) {
    const list = await ReadingList.query()
      .where('id', listId)
      .where('member_id', memberId)
      .where('tenant_id', borrowingTenantId())
      .firstOrFail()

    const item = await ReadingListItem.query()
      .where('id', itemId)
      .where('reading_list_id', list.id)
      .firstOrFail()

    await item.delete()
    return this.serializeList(list)
  }

  private async serializeList(list: ReadingList) {
    const items = await ReadingListItem.query()
      .where('reading_list_id', list.id)
      .orderBy('position', 'asc')

    const books = await Promise.all(items.map((item) => Book.find(item.bookId)))

    return {
      id: list.id,
      name: list.name,
      description: list.description,
      isPublic: list.isPublic,
      items: items.map((item, index) => ({
        id: item.id,
        bookId: item.bookId,
        title: books[index]?.title ?? null,
        position: item.position,
      })),
    }
  }
}
