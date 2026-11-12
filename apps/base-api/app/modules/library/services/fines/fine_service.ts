import { DateTime } from 'luxon'
import Fine from '#modules/library/models/fine'
import FinePayment from '#modules/library/models/fine_payment'
import Borrowing from '#modules/library/models/borrowing'
import BusinessRuleException from '#modules/library/exceptions/business_rule_exception'
import AuditService, { type AuditContext } from '#modules/library/services/audit/audit_service'
import {
  balanceCents,
  calculateLostPenaltyCents,
  calculateOverdueFineCents,
  computeFineStatus,
} from '#modules/library/services/fines/fine_calculator'
import CirculationRulesService from '#modules/library/services/borrowing/circulation_rules_service'
import { borrowingTenantId } from '#modules/library/services/borrowing/borrowing_helpers'
import { enqueueNotification } from '#modules/library/services/queue/queue_service'
import { NOTIFICATION_EVENTS } from '#modules/library/services/notifications/notification_types'
import { formatMoneyFromCents } from '#modules/library/helpers/currency'
import { scheduleIntegrationSideEffects } from '#modules/library/services/ulmis/integration_outbox_hooks'

export interface FineListFilters {
  memberId?: string
  status?: Fine['status']
  page?: number
  perPage?: number
}

export interface ManualFineInput {
  memberId: string
  amountCents: number
  notes?: string
}

export interface AdjustFineInput {
  amountCents: number
  notes?: string
}

export interface WaiveFineInput {
  amountCents?: number
  reason: string
}

export interface RecordPaymentInput {
  amountCents: number
  paymentMethod?: string
  reference?: string
}

export default class FineService {
  constructor(
    private auditService = new AuditService(),
    private rulesService = new CirculationRulesService()
  ) {}

  async list(filters: FineListFilters) {
    const page = filters.page ?? 1
    const perPage = Math.min(filters.perPage ?? 25, 100)
    const tid = borrowingTenantId()

    const query = Fine.query().where('tenant_id', tid).preload('member').preload('borrowing')

    if (filters.memberId) query.where('member_id', filters.memberId)
    if (filters.status) query.where('status', filters.status)

    return query.orderBy('assessed_at', 'desc').paginate(page, perPage)
  }

  async summary() {
    const tid = borrowingTenantId()
    const fines = await Fine.query().where('tenant_id', tid)

    let totalOutstandingCents = 0
    let pendingCount = 0
    let partialCount = 0

    for (const fine of fines) {
      const balance = balanceCents(fine.amountCents, fine.paidCents, fine.waivedCents)
      if (balance > 0) {
        totalOutstandingCents += balance
        if (fine.status === 'pending') pendingCount++
        if (fine.status === 'partial') partialCount++
      }
    }

    return {
      totalOutstandingCents,
      pendingCount,
      partialCount,
      totalFines: fines.length,
    }
  }

  async findById(id: string) {
    return Fine.query()
      .where('id', id)
      .where('tenant_id', borrowingTenantId())
      .preload('member')
      .preload('borrowing', (q) => q.preload('book'))
      .firstOrFail()
  }

  async assessOverdueFine(borrowingId: string, returnedAt: DateTime = DateTime.now()) {
    const borrowing = await Borrowing.query()
      .where('id', borrowingId)
      .where('tenant_id', borrowingTenantId())
      .preload('book')
      .firstOrFail()

    if (!borrowing.dueAt) return null

    const rules = await this.rulesService.getRules()
    const amountCents = calculateOverdueFineCents(borrowing.dueAt, returnedAt, rules)
    if (amountCents <= 0) return null

    const existing = await Fine.query()
      .where('borrowing_id', borrowingId)
      .where('reason', 'overdue')
      .first()

    if (existing) {
      existing.amountCents = amountCents
      existing.status = computeFineStatus(amountCents, existing.paidCents, existing.waivedCents)
      await existing.save()
      return existing
    }

    const fine = await Fine.create({
      tenantId: borrowing.tenantId,
      memberId: borrowing.memberId,
      borrowingId: borrowing.id,
      reason: 'overdue',
      amountCents,
      paidCents: 0,
      waivedCents: 0,
      status: 'pending',
      assessedAt: DateTime.now(),
      dueAt: borrowing.dueAt.plus({ days: 7 }),
      notes: `Late return fine for "${borrowing.book?.title ?? 'book'}"`,
    })

    await enqueueNotification({
      tenantId: borrowing.tenantId,
      eventType: NOTIFICATION_EVENTS.FINE_ASSESSED,
      recipientType: 'member',
      recipientId: borrowing.memberId,
      title: 'Fine assessed',
      body: `A late return fine of ${formatMoneyFromCents(amountCents)} was assessed for "${borrowing.book?.title ?? 'book'}".`,
      payload: { fineId: fine.id, amountCents },
    })

    scheduleIntegrationSideEffects(fine)

    return fine
  }

  async assessLostFine(borrowingId: string) {
    const borrowing = await Borrowing.query()
      .where('id', borrowingId)
      .where('tenant_id', borrowingTenantId())
      .preload('book')
      .firstOrFail()

    const existing = await Fine.query()
      .where('borrowing_id', borrowingId)
      .where('reason', 'lost')
      .first()

    if (existing) return existing

    const rules = await this.rulesService.getRules()
    const amountCents = calculateLostPenaltyCents(rules)

    const fine = await Fine.create({
      tenantId: borrowing.tenantId,
      memberId: borrowing.memberId,
      borrowingId: borrowing.id,
      reason: 'lost',
      amountCents,
      paidCents: 0,
      waivedCents: 0,
      status: 'pending',
      assessedAt: DateTime.now(),
      notes: `Lost book penalty for "${borrowing.book?.title ?? 'book'}"`,
    })

    await enqueueNotification({
      tenantId: borrowing.tenantId,
      eventType: NOTIFICATION_EVENTS.FINE_ASSESSED,
      recipientType: 'member',
      recipientId: borrowing.memberId,
      title: 'Fine assessed',
      body: `A lost book penalty of ${formatMoneyFromCents(amountCents)} was assessed for "${borrowing.book?.title ?? 'book'}".`,
      payload: { fineId: fine.id, amountCents },
    })

    scheduleIntegrationSideEffects(fine)

    return fine
  }

  async createManual(input: ManualFineInput, auditCtx?: AuditContext) {
    if (input.amountCents <= 0) {
      throw new BusinessRuleException('Fine amount must be greater than zero')
    }

    const fine = await Fine.create({
      tenantId: borrowingTenantId(),
      memberId: input.memberId,
      borrowingId: null,
      reason: 'manual',
      amountCents: input.amountCents,
      paidCents: 0,
      waivedCents: 0,
      status: 'pending',
      assessedAt: DateTime.now(),
      notes: input.notes ?? 'Manual fine adjustment',
    })

    scheduleIntegrationSideEffects(fine)

    await this.auditService.log(
      'create',
      'fine',
      fine.id,
      null,
      this.serializeFine(fine),
      auditCtx
    )

    return this.findById(fine.id)
  }

  async adjust(fineId: string, input: AdjustFineInput, auditCtx?: AuditContext) {
    const fine = await this.findById(fineId)

    if (input.amountCents <= 0) {
      throw new BusinessRuleException('Fine amount must be greater than zero')
    }

    const oldAmount = fine.amountCents
    fine.amountCents = input.amountCents
    if (input.notes) fine.notes = input.notes
    fine.status = computeFineStatus(fine.amountCents, fine.paidCents, fine.waivedCents)
    await fine.save()

    await this.auditService.log(
      'update',
      'fine',
      fine.id,
      { amountCents: oldAmount },
      { amountCents: fine.amountCents },
      auditCtx
    )

    return this.findById(fine.id)
  }

  async waive(fineId: string, input: WaiveFineInput, userId: string, auditCtx?: AuditContext) {
    const fine = await this.findById(fineId)
    const balance = balanceCents(fine.amountCents, fine.paidCents, fine.waivedCents)

    if (balance <= 0) {
      throw new BusinessRuleException('Fine has no outstanding balance to waive')
    }

    const waiveAmount = input.amountCents ?? balance
    if (waiveAmount <= 0 || waiveAmount > balance) {
      throw new BusinessRuleException('Invalid waiver amount')
    }

    fine.waivedCents += waiveAmount
    fine.waivedAt = DateTime.now()
    fine.waivedBy = userId
    fine.waiveReason = input.reason
    fine.status = computeFineStatus(fine.amountCents, fine.paidCents, fine.waivedCents)
    await fine.save()

    await this.auditService.log(
      'update',
      'fine',
      fine.id,
      { waivedCents: fine.waivedCents - waiveAmount },
      { waivedCents: fine.waivedCents, reason: input.reason },
      auditCtx
    )

    return this.findById(fine.id)
  }

  async recordPayment(
    fineId: string,
    input: RecordPaymentInput,
    userId: string,
    auditCtx?: AuditContext
  ) {
    const fine = await this.findById(fineId)
    const balance = balanceCents(fine.amountCents, fine.paidCents, fine.waivedCents)

    if (balance <= 0) {
      throw new BusinessRuleException('Fine is already settled')
    }

    if (input.amountCents <= 0 || input.amountCents > balance) {
      throw new BusinessRuleException('Invalid payment amount')
    }

    await FinePayment.create({
      tenantId: fine.tenantId,
      fineId: fine.id,
      amountCents: input.amountCents,
      paymentMethod: input.paymentMethod ?? 'cash',
      reference: input.reference ?? null,
      receivedBy: userId,
      paidAt: DateTime.now(),
    })

    fine.paidCents += input.amountCents
    fine.status = computeFineStatus(fine.amountCents, fine.paidCents, fine.waivedCents)
    await fine.save()

    await this.auditService.log(
      'update',
      'fine',
      fine.id,
      { paidCents: fine.paidCents - input.amountCents },
      { paidCents: fine.paidCents, paymentMethod: input.paymentMethod ?? 'cash' },
      auditCtx
    )

    scheduleIntegrationSideEffects(fine, input.reference ?? null)

    return this.findById(fine.id)
  }

  async getPayments(fineId: string) {
    await this.findById(fineId)

    const payments = await FinePayment.query()
      .where('fine_id', fineId)
      .where('tenant_id', borrowingTenantId())
      .orderBy('paid_at', 'desc')

    return payments.map((p) => ({
      id: p.id,
      amountCents: p.amountCents,
      paymentMethod: p.paymentMethod,
      reference: p.reference,
      paidAt: p.paidAt.toISO(),
    }))
  }

  /** Outstanding fines that block borrowing for a member. */
  async getBlockingFines(memberId: string) {
    const fines = await Fine.query()
      .where('tenant_id', borrowingTenantId())
      .where('member_id', memberId)
      .whereIn('status', ['pending', 'partial'])
      .preload('borrowing', (q) => q.preload('book'))

    return fines
      .map((fine) => this.serializeFine(fine))
      .filter((fine) => fine.balanceCents > 0)
  }

  async hasBlockingFines(memberId: string) {
    const blocking = await this.getBlockingFines(memberId)
    return blocking.length > 0
  }

  serializeFine(fine: Fine) {
    const balance = balanceCents(fine.amountCents, fine.paidCents, fine.waivedCents)

    return {
      id: fine.id,
      memberId: fine.memberId,
      memberName: fine.member?.fullName,
      borrowingId: fine.borrowingId,
      bookTitle: fine.borrowing?.book?.title ?? null,
      reason: fine.reason,
      amountCents: fine.amountCents,
      paidCents: fine.paidCents,
      waivedCents: fine.waivedCents,
      balanceCents: balance,
      status: fine.status,
      assessedAt: fine.assessedAt.toISO(),
      dueAt: fine.dueAt?.toISO() ?? null,
      waivedAt: fine.waivedAt?.toISO() ?? null,
      waiveReason: fine.waiveReason,
      notes: fine.notes,
      createdAt: fine.createdAt.toISO(),
    }
  }
}
