import { DateTime } from 'luxon'
import Member, { type MemberType, type MembershipStatus } from '#modules/library/models/member'
import Borrowing from '#modules/library/models/borrowing'
import AuditService, { type AuditContext } from '#modules/library/services/audit/audit_service'
import {
  buildMemberSearchText,
  generateLibraryCardNumber,
  memberTenantId,
} from '#modules/library/services/members/member_helpers'
import { scheduleMemberReindex, scheduleSearchIndex } from '#modules/library/services/search/search_index_hook'

export interface MemberListFilters {
  search?: string
  memberType?: MemberType
  membershipStatus?: MembershipStatus
  department?: string
  page?: number
  perPage?: number
}

export interface CreateMemberInput {
  fullName: string
  email?: string
  contact?: string
  department?: string
  memberType: MemberType
  notes?: string
  autoApprove?: boolean
  isBlacklisted?: boolean
  isEnrolled?: boolean
  academicStatus?: string
}

export interface UpdateMemberInput {
  fullName?: string
  email?: string | null
  contact?: string | null
  department?: string | null
  memberType?: MemberType
  membershipStatus?: MembershipStatus
  notes?: string | null
  isBlacklisted?: boolean
  isEnrolled?: boolean
  academicStatus?: string | null
}

export default class MemberService {
  constructor(private auditService = new AuditService()) {}

  async list(filters: MemberListFilters) {
    const page = filters.page ?? 1
    const perPage = Math.min(filters.perPage ?? 25, 100)
    const tid = memberTenantId()

    const query = Member.query().where('tenant_id', tid).whereNull('deleted_at')

    if (filters.search) {
      const term = `%${filters.search.toLowerCase()}%`
      query.where((q) => {
        q.whereILike('full_name', term)
          .orWhereILike('email', term)
          .orWhereILike('contact', term)
          .orWhereILike('department', term)
          .orWhereILike('library_card_number', term)
          .orWhereILike('search_text', term)
      })
    }

    if (filters.memberType) query.where('member_type', filters.memberType)
    if (filters.membershipStatus) query.where('membership_status', filters.membershipStatus)
    if (filters.department) query.whereILike('department', `%${filters.department}%`)

    return query.orderBy('created_at', 'desc').paginate(page, perPage)
  }

  async pendingCount() {
    const result = await Member.query()
      .where('tenant_id', memberTenantId())
      .where('membership_status', 'pending')
      .whereNull('deleted_at')
      .count('* as total')
      .first()

    return Number(result?.$extras.total ?? 0)
  }

  async findById(memberId: string) {
    return Member.query()
      .where('id', memberId)
      .where('tenant_id', memberTenantId())
      .whereNull('deleted_at')
      .firstOrFail()
  }

  async create(input: CreateMemberInput, auditCtx?: AuditContext) {
    const tid = memberTenantId()

    if (input.email) {
      const existing = await Member.query()
        .where('tenant_id', tid)
        .whereILike('email', input.email.trim())
        .whereNull('deleted_at')
        .first()

      if (existing) throw new Error('Member with this email already exists')
    }

    const count = await Member.query().where('tenant_id', tid).count('* as total').first()
    const libraryCardNumber = generateLibraryCardNumber(tid, Number(count?.$extras.total ?? 0) + 1)

    const status: MembershipStatus = input.autoApprove ? 'approved' : 'pending'

    const member = await Member.create({
      tenantId: tid,
      fullName: input.fullName.trim(),
      email: input.email?.trim().toLowerCase() ?? null,
      contact: input.contact?.trim() ?? null,
      department: input.department?.trim() ?? null,
      memberType: input.memberType,
      membershipStatus: status,
      libraryCardNumber,
      notes: input.notes ?? null,
      isBlacklisted: input.isBlacklisted ?? false,
      isEnrolled: input.isEnrolled ?? true,
      academicStatus: input.academicStatus?.trim() ?? null,
      approvedAt: input.autoApprove ? DateTime.now() : null,
      approvedBy: input.autoApprove ? auditCtx?.userId ?? null : null,
      searchText: buildMemberSearchText({
        fullName: input.fullName,
        email: input.email,
        contact: input.contact,
        department: input.department,
        libraryCardNumber,
        memberType: input.memberType,
      }),
    })

    await this.auditService.log(
      'create',
      'member',
      member.id,
      null,
      this.serializeSnapshot(member),
      auditCtx
    )

    scheduleMemberReindex(member.id, tid)

    return member
  }

  async update(memberId: string, input: UpdateMemberInput, auditCtx?: AuditContext) {
    const member = await this.findById(memberId)
    const oldSnapshot = this.serializeSnapshot(member)

    if (input.email !== undefined && input.email) {
      const existing = await Member.query()
        .where('tenant_id', memberTenantId())
        .whereILike('email', input.email.trim())
        .whereNot('id', memberId)
        .whereNull('deleted_at')
        .first()

      if (existing) throw new Error('Member with this email already exists')
    }

    if (input.fullName !== undefined) member.fullName = input.fullName.trim()
    if (input.email !== undefined) member.email = input.email?.trim().toLowerCase() ?? null
    if (input.contact !== undefined) member.contact = input.contact?.trim() ?? null
    if (input.department !== undefined) member.department = input.department?.trim() ?? null
    if (input.memberType !== undefined) member.memberType = input.memberType
    if (input.membershipStatus !== undefined) member.membershipStatus = input.membershipStatus
    if (input.notes !== undefined) member.notes = input.notes
    if (input.isBlacklisted !== undefined) member.isBlacklisted = input.isBlacklisted
    if (input.isEnrolled !== undefined) member.isEnrolled = input.isEnrolled
    if (input.academicStatus !== undefined) {
      member.academicStatus = input.academicStatus?.trim() ?? null
    }

    member.searchText = buildMemberSearchText({
      fullName: member.fullName,
      email: member.email,
      contact: member.contact,
      department: member.department,
      libraryCardNumber: member.libraryCardNumber,
      memberType: member.memberType,
    })

    await member.save()

    await this.auditService.log(
      'update',
      'member',
      member.id,
      oldSnapshot,
      this.serializeSnapshot(member),
      auditCtx
    )

    scheduleMemberReindex(member.id)

    return member
  }

  async softDelete(memberId: string, auditCtx?: AuditContext) {
    const member = await this.findById(memberId)
    const snapshot = this.serializeSnapshot(member)

    member.deletedAt = DateTime.now()
    member.membershipStatus = 'expired'
    await member.save()

    await this.auditService.log('delete', 'member', member.id, snapshot, null, auditCtx)
    scheduleSearchIndex('member', member.id, 'delete', memberTenantId())
  }

  async approve(memberId: string, userId: string, auditCtx?: AuditContext) {
    const member = await this.findById(memberId)

    if (member.membershipStatus !== 'pending') {
      throw new Error('Only pending members can be approved')
    }

    const oldSnapshot = this.serializeSnapshot(member)

    member.membershipStatus = 'approved'
    member.approvedAt = DateTime.now()
    member.approvedBy = userId
    member.rejectedAt = null
    member.rejectedBy = null
    member.rejectionReason = null
    await member.save()

    await this.auditService.log(
      'update',
      'member',
      member.id,
      oldSnapshot,
      { ...this.serializeSnapshot(member), action: 'approved' },
      auditCtx
    )

    scheduleMemberReindex(member.id)

    return member
  }

  async reject(memberId: string, userId: string, reason?: string, auditCtx?: AuditContext) {
    const member = await this.findById(memberId)

    if (member.membershipStatus !== 'pending') {
      throw new Error('Only pending members can be rejected')
    }

    const oldSnapshot = this.serializeSnapshot(member)

    member.membershipStatus = 'rejected'
    member.rejectedAt = DateTime.now()
    member.rejectedBy = userId
    member.rejectionReason = reason ?? null
    await member.save()

    await this.auditService.log(
      'update',
      'member',
      member.id,
      oldSnapshot,
      { ...this.serializeSnapshot(member), action: 'rejected' },
      auditCtx
    )

    return member
  }

  async getBorrowingHistory(memberId: string) {
    await this.findById(memberId)

    const borrowings = await Borrowing.query()
      .where('member_id', memberId)
      .where('tenant_id', memberTenantId())
      .preload('book')
      .orderBy('created_at', 'desc')
      .limit(50)

    return {
      items: borrowings.map((b) => ({
        id: b.id,
        transactionNumber: b.transactionNumber,
        bookId: b.bookId,
        bookTitle: b.book?.title ?? null,
        status: b.status,
        borrowedAt: b.borrowedAt?.toISO() ?? null,
        dueAt: b.dueAt?.toISO() ?? null,
        returnedAt: b.returnedAt?.toISO() ?? null,
        notes: b.notes,
      })),
      placeholder: false,
    }
  }

  serializeMember(member: Member) {
    return {
      id: member.id,
      fullName: member.fullName,
      email: member.email,
      contact: member.contact,
      department: member.department,
      memberType: member.memberType,
      membershipStatus: member.membershipStatus,
      libraryCardNumber: member.libraryCardNumber,
      approvedAt: member.approvedAt?.toISO() ?? null,
      membershipExpiresAt: member.membershipExpiresAt?.toISO() ?? null,
      rejectedAt: member.rejectedAt?.toISO() ?? null,
      rejectionReason: member.rejectionReason,
      notes: member.notes,
      isBlacklisted: member.isBlacklisted ?? false,
      isEnrolled: member.isEnrolled ?? true,
      academicStatus: member.academicStatus ?? null,
      createdAt: member.createdAt.toISO(),
      updatedAt: member.updatedAt?.toISO() ?? null,
    }
  }

  private serializeSnapshot(member: Member) {
    return {
      fullName: member.fullName,
      email: member.email,
      memberType: member.memberType,
      membershipStatus: member.membershipStatus,
      libraryCardNumber: member.libraryCardNumber,
    }
  }
}
