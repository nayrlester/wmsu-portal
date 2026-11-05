import { DateTime } from 'luxon'
import AcquisitionRequest, {
  type AcquisitionRequestStatus,
} from '#modules/library/models/acquisition_request'
import Book from '#modules/library/models/book'
import Member from '#modules/library/models/member'
import BusinessRuleException from '#modules/library/exceptions/business_rule_exception'
import AuditService, { type AuditContext } from '#modules/library/services/audit/audit_service'
import UlmisOutboxService from '#modules/library/services/ulmis/ulmis_outbox_service'
import { tenantContext } from '#modules/library/services/tenant/tenant_context'
import { enqueueNotification } from '#modules/library/services/queue/queue_service'

export type AcquisitionListFilters = {
  search?: string
  status?: AcquisitionRequestStatus
  memberId?: string
  page?: number
  perPage?: number
}

export type AcquisitionCreateInput = {
  title: string
  authors?: string
  isbn13?: string
  materialType?: string
  publisherName?: string
  publicationYear?: number
  quantity?: number
  justification?: string
  requestingUnit?: string
  notes?: string
  memberId?: string
  bookId?: string
}

export type AcquisitionUpdateInput = Partial<AcquisitionCreateInput>

function tenantId() {
  return tenantContext.get().id
}

export default class AcquisitionService {
  constructor(
    private auditService = new AuditService(),
    private outbox = new UlmisOutboxService()
  ) {}

  async dashboard() {
    const tid = tenantId()
    const statuses: AcquisitionRequestStatus[] = [
      'draft',
      'submitted',
      'routed',
      'acknowledged',
      'cataloged',
      'cancelled',
    ]
    const byStatus: Record<string, number> = {}
    for (const status of statuses) {
      const row = await AcquisitionRequest.query()
        .where('tenant_id', tid)
        .where('status', status)
        .count('* as total')
        .first()
      byStatus[status] = Number(row?.$extras.total ?? 0)
    }
    const recent = await AcquisitionRequest.query()
      .where('tenant_id', tid)
      .orderBy('updated_at', 'desc')
      .limit(8)

    return {
      draftCount: byStatus.draft,
      submittedCount: byStatus.submitted,
      routedCount: byStatus.routed,
      acknowledgedCount: byStatus.acknowledged,
      catalogedCount: byStatus.cataloged,
      cancelledCount: byStatus.cancelled,
      pendingRouteCount: byStatus.submitted,
      byStatus,
      recent: recent.map((r) => this.serialize(r)),
      ownershipNote:
        'ULMIS owns acquisition requests; UFMS owns purchase requisitions/orders/receiving (LIB-008 / INT-LIB-07)',
    }
  }

  async list(filters: AcquisitionListFilters) {
    const tid = tenantId()
    const page = filters.page ?? 1
    const perPage = Math.min(filters.perPage ?? 25, 100)
    const query = AcquisitionRequest.query()
      .where('tenant_id', tid)
      .preload('member')
      .preload('book')
      .preload('catalogedBook')
      .orderBy('created_at', 'desc')

    if (filters.status) query.where('status', filters.status)
    if (filters.memberId) query.where('member_id', filters.memberId)
    if (filters.search?.trim()) {
      const term = `%${filters.search.trim()}%`
      query.where((q) => {
        q.whereILike('title', term)
          .orWhereILike('authors', term)
          .orWhereILike('request_number', term)
          .orWhereILike('isbn13', term)
          .orWhereILike('ufms_pr_ref', term)
      })
    }

    return query.paginate(page, perPage)
  }

  async findById(id: string) {
    return AcquisitionRequest.query()
      .where('id', id)
      .where('tenant_id', tenantId())
      .preload('member')
      .preload('book')
      .preload('catalogedBook')
      .firstOrFail()
  }

  async create(input: AcquisitionCreateInput, userId: string, auditCtx?: AuditContext) {
    await this.assertOptionalRefs(input.memberId, input.bookId)
    const requestNumber = await this.nextRequestNumber()
    const row = await AcquisitionRequest.create({
      tenantId: tenantId(),
      requestNumber,
      status: 'draft',
      title: input.title.trim(),
      authors: input.authors?.trim() || null,
      isbn13: input.isbn13?.trim() || null,
      materialType: input.materialType?.trim() || null,
      publisherName: input.publisherName?.trim() || null,
      publicationYear: input.publicationYear ?? null,
      quantity: input.quantity ?? 1,
      justification: input.justification?.trim() || null,
      requestingUnit: input.requestingUnit?.trim() || null,
      notes: input.notes?.trim() || null,
      memberId: input.memberId ?? null,
      bookId: input.bookId ?? null,
      createdBy: userId,
    })

    await this.auditService.log(
      'create',
      'acquisition_request',
      row.id,
      null,
      this.serialize(row),
      auditCtx
    )

    return this.findById(row.id)
  }

  async update(id: string, input: AcquisitionUpdateInput, auditCtx?: AuditContext) {
    const row = await this.findById(id)
    if (row.status !== 'draft') {
      throw new BusinessRuleException('Only draft acquisition requests can be edited')
    }
    await this.assertOptionalRefs(
      input.memberId === undefined ? undefined : input.memberId ?? undefined,
      input.bookId === undefined ? undefined : input.bookId ?? undefined
    )

    const before = this.serialize(row)
    if (input.title !== undefined) row.title = input.title.trim()
    if (input.authors !== undefined) row.authors = input.authors?.trim() || null
    if (input.isbn13 !== undefined) row.isbn13 = input.isbn13?.trim() || null
    if (input.materialType !== undefined) row.materialType = input.materialType?.trim() || null
    if (input.publisherName !== undefined) row.publisherName = input.publisherName?.trim() || null
    if (input.publicationYear !== undefined) row.publicationYear = input.publicationYear
    if (input.quantity !== undefined) row.quantity = input.quantity
    if (input.justification !== undefined) row.justification = input.justification?.trim() || null
    if (input.requestingUnit !== undefined) row.requestingUnit = input.requestingUnit?.trim() || null
    if (input.notes !== undefined) row.notes = input.notes?.trim() || null
    if (input.memberId !== undefined) row.memberId = input.memberId
    if (input.bookId !== undefined) row.bookId = input.bookId
    await row.save()

    await this.auditService.log(
      'update',
      'acquisition_request',
      row.id,
      before,
      this.serialize(row),
      auditCtx
    )
    return this.findById(row.id)
  }

  async submit(id: string, userId: string, auditCtx?: AuditContext) {
    const row = await this.findById(id)
    if (row.status !== 'draft') {
      throw new BusinessRuleException('Only draft requests can be submitted')
    }
    const before = { status: row.status }
    row.status = 'submitted'
    row.submittedBy = userId
    row.submittedAt = DateTime.now()
    await row.save()

    await this.auditService.log(
      'update',
      'acquisition_request',
      row.id,
      before,
      { status: 'submitted' },
      auditCtx
    )

    if (row.memberId) {
      await enqueueNotification({
        tenantId: row.tenantId,
        eventType: 'acquisition.submitted',
        recipientType: 'member',
        recipientId: row.memberId,
        title: 'Acquisition request submitted',
        body: `"${row.title}" was submitted for library routing to procurement.`,
        payload: { acquisitionRequestId: row.id, requestNumber: row.requestNumber },
      })
    }

    return this.findById(row.id)
  }

  async routeToProcurement(id: string, userId: string, auditCtx?: AuditContext) {
    const row = await this.findById(id)
    if (row.status !== 'submitted' && row.status !== 'draft') {
      throw new BusinessRuleException('Only draft or submitted requests can be routed to UFMS')
    }

    const idempotencyKey = `INT-LIB-07:${row.id}:route`
    const payload = {
      contractCode: 'INT-LIB-07',
      sourceSystem: 'ULMIS',
      targetSystem: 'UFMS',
      acquisitionRequestId: row.id,
      requestNumber: row.requestNumber,
      title: row.title,
      authors: row.authors,
      isbn13: row.isbn13,
      materialType: row.materialType,
      publisherName: row.publisherName,
      publicationYear: row.publicationYear,
      quantity: row.quantity,
      justification: row.justification,
      requestingUnit: row.requestingUnit,
      memberId: row.memberId,
      bookId: row.bookId,
      notes: row.notes,
      tor: ['LIB-008'],
      ufmsHint: {
        suggestedPurpose: `Library acquisition ${row.requestNumber}: ${row.title}`,
        lines: [
          {
            description: [row.title, row.authors].filter(Boolean).join(' — '),
            quantity: row.quantity,
            uom: 'copy',
          },
        ],
      },
    }

    const outboxRow = await this.outbox.enqueue({
      contractCode: 'INT-LIB-07',
      targetSystem: 'UFMS',
      eventType: 'acquisition.request.routed',
      idempotencyKey,
      payload,
    })

    const before = { status: row.status, outboxId: row.outboxId }
    if (row.status === 'draft') {
      row.submittedBy = row.submittedBy ?? userId
      row.submittedAt = row.submittedAt ?? DateTime.now()
    }
    row.status = 'routed'
    row.routedBy = userId
    row.routedAt = DateTime.now()
    row.outboxId = outboxRow.id
    await row.save()

    await this.auditService.log(
      'update',
      'acquisition_request',
      row.id,
      before,
      { status: 'routed', outboxId: outboxRow.id },
      auditCtx
    )

    return this.findById(row.id)
  }

  async acknowledgeProcurementRef(
    id: string,
    ufmsPrRef: string,
    auditCtx?: AuditContext
  ) {
    const row = await this.findById(id)
    if (!['routed', 'acknowledged'].includes(row.status)) {
      throw new BusinessRuleException('Procurement reference can only be set on routed requests')
    }
    const before = { status: row.status, ufmsPrRef: row.ufmsPrRef }
    row.ufmsPrRef = ufmsPrRef.trim()
    row.status = 'acknowledged'
    row.acknowledgedAt = DateTime.now()
    await row.save()

    await this.auditService.log(
      'update',
      'acquisition_request',
      row.id,
      before,
      { status: 'acknowledged', ufmsPrRef: row.ufmsPrRef },
      auditCtx
    )
    return this.findById(row.id)
  }

  async linkCatalog(id: string, catalogedBookId: string, auditCtx?: AuditContext) {
    const row = await this.findById(id)
    if (!['routed', 'acknowledged', 'cataloged'].includes(row.status)) {
      throw new BusinessRuleException(
        'Catalog link is only allowed after the request has been routed to procurement'
      )
    }

    const book = await Book.query()
      .where('id', catalogedBookId)
      .where('tenant_id', tenantId())
      .whereNull('deleted_at')
      .firstOrFail()

    const before = { status: row.status, catalogedBookId: row.catalogedBookId }
    row.catalogedBookId = book.id
    row.status = 'cataloged'
    row.catalogedAt = DateTime.now()
    await row.save()

    await this.auditService.log(
      'update',
      'acquisition_request',
      row.id,
      before,
      { status: 'cataloged', catalogedBookId: book.id },
      auditCtx
    )
    return this.findById(row.id)
  }

  async cancel(id: string, userId: string, reason?: string, auditCtx?: AuditContext) {
    const row = await this.findById(id)
    if (!['draft', 'submitted'].includes(row.status)) {
      throw new BusinessRuleException(
        'Only draft or submitted requests can be cancelled (routed requests belong to UFMS lifecycle)'
      )
    }
    const before = { status: row.status }
    row.status = 'cancelled'
    row.cancelledBy = userId
    row.cancelledAt = DateTime.now()
    row.cancelReason = reason?.trim() || null
    await row.save()

    await this.auditService.log(
      'update',
      'acquisition_request',
      row.id,
      before,
      { status: 'cancelled', cancelReason: row.cancelReason },
      auditCtx
    )
    return this.findById(row.id)
  }

  serialize(row: AcquisitionRequest) {
    return {
      id: row.id,
      requestNumber: row.requestNumber,
      status: row.status,
      title: row.title,
      authors: row.authors,
      isbn13: row.isbn13,
      materialType: row.materialType,
      publisherName: row.publisherName,
      publicationYear: row.publicationYear,
      quantity: row.quantity,
      justification: row.justification,
      requestingUnit: row.requestingUnit,
      notes: row.notes,
      memberId: row.memberId,
      memberName: row.member?.fullName ?? null,
      bookId: row.bookId,
      bookTitle: row.book?.title ?? null,
      catalogedBookId: row.catalogedBookId,
      catalogedBookTitle: row.catalogedBook?.title ?? null,
      ufmsPrRef: row.ufmsPrRef,
      outboxId: row.outboxId,
      submittedAt: row.submittedAt?.toISO() ?? null,
      routedAt: row.routedAt?.toISO() ?? null,
      acknowledgedAt: row.acknowledgedAt?.toISO() ?? null,
      catalogedAt: row.catalogedAt?.toISO() ?? null,
      cancelledAt: row.cancelledAt?.toISO() ?? null,
      cancelReason: row.cancelReason,
      createdAt: row.createdAt.toISO(),
      updatedAt: row.updatedAt?.toISO() ?? null,
    }
  }

  private async assertOptionalRefs(memberId?: string | null, bookId?: string | null) {
    const tid = tenantId()
    if (memberId) {
      await Member.query()
        .where('id', memberId)
        .where('tenant_id', tid)
        .whereNull('deleted_at')
        .firstOrFail()
    }
    if (bookId) {
      await Book.query()
        .where('id', bookId)
        .where('tenant_id', tid)
        .whereNull('deleted_at')
        .firstOrFail()
    }
  }

  private async nextRequestNumber() {
    const tid = tenantId()
    const year = DateTime.now().year
    const prefix = `ACQ-${year}-`
    const latest = await AcquisitionRequest.query()
      .where('tenant_id', tid)
      .whereILike('request_number', `${prefix}%`)
      .orderBy('request_number', 'desc')
      .first()

    let sequence = 1
    if (latest) {
      const parts = latest.requestNumber.split('-')
      const last = Number.parseInt(parts[parts.length - 1] ?? '0', 10)
      if (!Number.isNaN(last)) sequence = last + 1
    }
    return `${prefix}${String(sequence).padStart(6, '0')}`
  }
}
