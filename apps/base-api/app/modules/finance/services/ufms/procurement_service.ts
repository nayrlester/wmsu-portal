import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'
import PurchaseRequisition from '#modules/finance/models/purchase_requisition'
import PurchaseRequisitionLine from '#modules/finance/models/purchase_requisition_line'
import ProcurementRfq from '#modules/finance/models/procurement_rfq'
import ProcurementQuotation from '#modules/finance/models/procurement_quotation'
import ProcurementAbstract from '#modules/finance/models/procurement_abstract'
import ProcurementAbstractLine from '#modules/finance/models/procurement_abstract_line'
import ProcurementAward from '#modules/finance/models/procurement_award'
import PurchaseOrder from '#modules/finance/models/purchase_order'
import PurchaseOrderLine from '#modules/finance/models/purchase_order_line'
import ProcurementDelivery from '#modules/finance/models/procurement_delivery'
import ProcurementDeliveryLine from '#modules/finance/models/procurement_delivery_line'
import InspectionAcceptanceReport from '#modules/finance/models/inspection_acceptance_report'
import ProcurementUimsEvent from '#modules/finance/models/procurement_uims_event'
import ProcurementDocumentRef from '#modules/finance/models/procurement_document_ref'
import Supplier from '#modules/finance/models/supplier'
import Fund from '#modules/finance/models/fund'
import ChartOfAccount from '#modules/finance/models/chart_of_account'
import FinancialPlan from '#modules/finance/models/financial_plan'
import { budgetService } from '#modules/finance/services/ufms/budget_service'
import { auditLogService } from '#modules/finance/services/audit_log_service'
import { addMoney, fromCents, toCents } from '#modules/finance/helpers/money'

type Actor = { id: string; organizationId: string }

const RFQ_METHODS = new Set(['quotation', 'bidding'])
const IAR_RESULTS = new Set(['accepted', 'rejected', 'partial'])

function moneyOrZero(v: unknown) {
  if (v === undefined || v === null || v === '') return '0.00'
  return fromCents(toCents(v as string | number))
}

function seq(prefix: string) {
  return `${prefix}-${DateTime.now().toFormat('yyyyLLdd')}-${Date.now().toString(36).toUpperCase()}`
}

function toDateTime(value: unknown): DateTime {
  if (DateTime.isDateTime(value)) return value
  if (value instanceof Date) return DateTime.fromJSDate(value)
  if (typeof value === 'string') {
    const parsed = DateTime.fromISO(value)
    if (parsed.isValid) return parsed
  }
  throw Object.assign(new Error('Invalid date value'), { status: 422 })
}

async function assertSupplier(organizationId: string, supplierId: string) {
  const supplier = await Supplier.query()
    .where('organizationId', organizationId)
    .where('id', supplierId)
    .first()
  if (!supplier) throw Object.assign(new Error('Supplier not found'), { status: 422 })
  if (!supplier.active) {
    throw Object.assign(new Error('Supplier is blacklisted or inactive'), { status: 422 })
  }
  const notes = String(supplier.eligibilityNotes ?? '')
  if (notes.toUpperCase().includes('[BLACKLISTED]')) {
    throw Object.assign(new Error('Supplier is blacklisted'), { status: 422 })
  }
  if (supplier.eligibilityValidUntil && supplier.eligibilityValidUntil < DateTime.now().startOf('day')) {
    throw Object.assign(new Error('Supplier eligibility has expired'), { status: 422 })
  }
  return supplier
}

function procurementMethodForAmount(amount: number) {
  if (amount <= 50_000) return 'shopping'
  if (amount <= 1_000_000) return 'small_value'
  return 'public_bidding'
}

export class ProcurementService {
  async listVendors(
    organizationId: string,
    filters: { q?: string; active?: boolean; page?: number; limit?: number }
  ) {
    const page = filters.page ?? 1
    const limit = Math.min(filters.limit ?? 50, 100)
    const q = Supplier.query().where('organizationId', organizationId).orderBy('name')
    if (filters.active === true) q.where('active', true)
    if (filters.active === false) q.where('active', false)
    if (filters.q) {
      const term = `%${filters.q}%`
      q.where((builder) => {
        builder.whereILike('name', term).orWhereILike('code', term).orWhereILike('tin', term)
      })
    }
    return q.paginate(page, limit)
  }

  async upsertVendor(actor: Actor, payload: Record<string, unknown>, id?: string) {
    const data = {
      code: String(payload.code).trim(),
      name: String(payload.name).trim(),
      contactName: (payload.contactName as string | null | undefined) ?? null,
      email: (payload.email as string | null | undefined) ?? null,
      phone: (payload.phone as string | null | undefined) ?? null,
      address: (payload.address as string | null | undefined) ?? null,
      tin: (payload.tin as string | null | undefined) ?? null,
      paymentTerms: (payload.paymentTerms as string | null | undefined) ?? null,
      eligibilityValidUntil: payload.eligibilityValidUntil
        ? toDateTime(payload.eligibilityValidUntil)
        : null,
      eligibilityNotes: (payload.eligibilityNotes as string | null | undefined) ?? null,
      performanceNotes: (payload.performanceNotes as string | null | undefined) ?? null,
      active: payload.active === undefined ? true : Boolean(payload.active),
    }

    let row: Supplier
    if (id) {
      row = await Supplier.query()
        .where('organizationId', actor.organizationId)
        .where('id', id)
        .firstOrFail()
      row.merge(data)
      await row.save()
    } else {
      row = await Supplier.create({ organizationId: actor.organizationId, ...data })
    }

    await auditLogService.log({
      organizationId: actor.organizationId,
      actorUserId: actor.id,
      action: id ? 'procurement.vendor.update' : 'procurement.vendor.create',
      entityType: 'supplier',
      entityId: row.id,
      metadata: { code: row.code, tor: 'FIN-013' },
    })
    return row
  }

  async listRequisitions(
    organizationId: string,
    filters: { status?: string; fiscalYear?: string; page?: number; limit?: number }
  ) {
    const page = filters.page ?? 1
    const limit = Math.min(filters.limit ?? 50, 100)
    const q = PurchaseRequisition.query()
      .where('organizationId', organizationId)
      .orderBy('createdAt', 'desc')
    if (filters.status) q.where('status', filters.status)
    if (filters.fiscalYear) q.where('fiscalYear', filters.fiscalYear)
    return q.paginate(page, limit)
  }

  async getRequisition(organizationId: string, id: string) {
    const row = await PurchaseRequisition.query()
      .where('organizationId', organizationId)
      .where('id', id)
      .preload('lines', (q) => q.orderBy('lineNo', 'asc'))
      .first()
    if (!row) throw Object.assign(new Error('Purchase requisition not found'), { status: 404 })
    return row
  }

  async createRequisition(actor: Actor, payload: Record<string, unknown>) {
    const linesInput = (payload.lines as Array<Record<string, unknown>> | undefined) ?? []
    if (!linesInput.length) {
      throw Object.assign(new Error('At least one requisition line is required'), { status: 422 })
    }

    if (payload.fundId) {
      const fund = await Fund.query()
        .where('organizationId', actor.organizationId)
        .where('id', String(payload.fundId))
        .first()
      if (!fund) throw Object.assign(new Error('Fund not found'), { status: 422 })
    }
    if (payload.accountId) {
      const account = await ChartOfAccount.query()
        .where('organizationId', actor.organizationId)
        .where('id', String(payload.accountId))
        .first()
      if (!account) throw Object.assign(new Error('Account not found'), { status: 422 })
    }
    if (payload.financialPlanId) {
      const plan = await FinancialPlan.query()
        .where('organizationId', actor.organizationId)
        .where('id', String(payload.financialPlanId))
        .first()
      if (!plan) throw Object.assign(new Error('Financial plan (APP/WFP) not found'), { status: 422 })
    }

    let estimated = '0.00'
    const normalized = linesInput.map((line, index) => {
      const qtyRaw = Number(line.quantity ?? 1)
      if (!Number.isFinite(qtyRaw) || qtyRaw <= 0) {
        throw Object.assign(new Error('Line quantity must be a positive number'), { status: 422 })
      }
      const unit = line.unitCost !== undefined && line.unitCost !== null ? moneyOrZero(line.unitCost) : null
      const amount =
        line.estimatedAmount !== undefined && line.estimatedAmount !== null
          ? moneyOrZero(line.estimatedAmount)
          : unit
            ? fromCents(BigInt(Math.round(qtyRaw * Number(unit) * 100)))
            : '0.00'
      estimated = addMoney(estimated, amount)
      return {
        lineNo: index + 1,
        description: String(line.description),
        quantity: String(qtyRaw),
        uom: (line.uom as string | null | undefined) ?? null,
        unitCost: unit,
        estimatedAmount: amount,
        itemId: (line.itemId as string | null | undefined) ?? null,
      }
    })

    const created = await db.transaction(async (trx) => {
      const header = await PurchaseRequisition.create(
        {
          organizationId: actor.organizationId,
          prNumber: String(payload.prNumber ?? '').trim() || seq('PR'),
          requestingOfficeId: (payload.requestingOfficeId as string | null | undefined) ?? null,
          purpose: (payload.purpose as string | null | undefined) ?? null,
          estimatedAmount: estimated,
          status: 'draft',
          fiscalYear: String(payload.fiscalYear ?? new Date().getFullYear()),
          fundId: (payload.fundId as string | null | undefined) ?? null,
          accountId: (payload.accountId as string | null | undefined) ?? null,
          budgetLineId: (payload.budgetLineId as string | null | undefined) ?? null,
          financialPlanId: (payload.financialPlanId as string | null | undefined) ?? null,
          createdBy: actor.id,
          updatedBy: actor.id,
        },
        { client: trx }
      )
      for (const line of normalized) {
        await PurchaseRequisitionLine.create(
          {
            organizationId: actor.organizationId,
            purchaseRequisitionId: header.id,
            ...line,
          },
          { client: trx }
        )
      }
      await header.useTransaction(trx).load('lines')
      return header
    })

    await auditLogService.log({
      organizationId: actor.organizationId,
      actorUserId: actor.id,
      action: 'procurement.pr.create',
      entityType: 'purchase_requisition',
      entityId: created.id,
      metadata: { prNumber: created.prNumber, tor: ['FIN-012', 'FIN-021'] },
    })
    return created
  }

  async submitRequisition(actor: Actor, id: string) {
    const pr = await this.getRequisition(actor.organizationId, id)
    if (pr.status !== 'draft' && pr.status !== 'rejected') {
      throw Object.assign(new Error('Only draft or rejected PRs can be submitted'), { status: 422 })
    }
    if (!pr.fundId || !pr.accountId || !pr.fiscalYear || !pr.estimatedAmount) {
      throw Object.assign(
        new Error('PR requires fund, account, fiscal year, and estimated amount for budget validation'),
        { status: 422 }
      )
    }

    const check = await budgetService.validateAvailability(actor.organizationId, {
      fundId: pr.fundId,
      accountId: pr.accountId,
      fiscalYear: pr.fiscalYear,
      amount: pr.estimatedAmount,
    })

    if (check.enforcement === 'hard' && !check.sufficient) {
      throw Object.assign(new Error('Insufficient budget allotment for this PR (hard stop)'), { status: 422 })
    }

    pr.merge({
      status: 'submitted',
      submittedAt: DateTime.now(),
      submittedBy: actor.id,
      updatedBy: actor.id,
      budgetCheckSufficient: check.sufficient,
      budgetCheckAvailable: check.availableAmount,
      budgetCheckedAt: DateTime.now(),
      rejectionReason: null,
      rejectedAt: null,
    })
    await pr.save()

    await auditLogService.log({
      organizationId: actor.organizationId,
      actorUserId: actor.id,
      action: 'procurement.pr.submit',
      entityType: 'purchase_requisition',
      entityId: pr.id,
      metadata: {
        sufficient: check.sufficient,
        availableAmount: check.availableAmount,
        enforcement: check.enforcement,
        tor: ['FIN-012', 'FIN-021', 'FIN-026'],
      },
    })
    return { pr, budgetCheck: check }
  }

  async approveRequisition(actor: Actor, id: string) {
    const pr = await this.getRequisition(actor.organizationId, id)
    if (pr.status !== 'submitted') {
      throw Object.assign(new Error('Only submitted PRs can be approved'), { status: 422 })
    }
    pr.merge({
      status: 'approved',
      approvedAt: DateTime.now(),
      approvedBy: actor.id,
      updatedBy: actor.id,
    })
    await pr.save()
    await auditLogService.log({
      organizationId: actor.organizationId,
      actorUserId: actor.id,
      action: 'procurement.pr.approve',
      entityType: 'purchase_requisition',
      entityId: pr.id,
      metadata: { tor: 'FIN-012' },
    })
    return pr
  }

  async rejectRequisition(actor: Actor, id: string, reason: string) {
    const pr = await this.getRequisition(actor.organizationId, id)
    if (pr.status !== 'submitted') {
      throw Object.assign(new Error('Only submitted PRs can be rejected'), { status: 422 })
    }
    pr.merge({
      status: 'rejected',
      rejectionReason: reason || 'Rejected',
      rejectedAt: DateTime.now(),
      updatedBy: actor.id,
      approvedAt: null,
      approvedBy: null,
    })
    await pr.save()
    await auditLogService.log({
      organizationId: actor.organizationId,
      actorUserId: actor.id,
      action: 'procurement.pr.reject',
      entityType: 'purchase_requisition',
      entityId: pr.id,
      metadata: { reason, tor: 'FIN-012' },
    })
    return pr
  }

  async createRfq(actor: Actor, payload: Record<string, unknown>) {
    const pr = await this.getRequisition(actor.organizationId, String(payload.purchaseRequisitionId))
    if (pr.status !== 'approved') {
      throw Object.assign(new Error('RFQ requires an approved purchase requisition'), { status: 422 })
    }
    const method = String(payload.method ?? 'quotation')
    if (!RFQ_METHODS.has(method)) {
      throw Object.assign(new Error('method must be quotation or bidding (TOR FIN-012)'), { status: 422 })
    }
    const estimated = Number((pr as { estimatedAmount?: string | number }).estimatedAmount ?? 0)
    const recommended = procurementMethodForAmount(estimated)
    if (method === 'quotation' && recommended === 'public_bidding') {
      throw Object.assign(
        new Error(`Amount ₱${estimated.toLocaleString('en-PH')} requires public bidding under RA 9184 thresholds`),
        { status: 422 }
      )
    }

    const rfq = await ProcurementRfq.create({
      organizationId: actor.organizationId,
      purchaseRequisitionId: pr.id,
      rfqNumber: String(payload.rfqNumber ?? '').trim() || seq('RFQ'),
      method,
      status: 'draft',
      philgepsReference: (payload.philgepsReference as string | null | undefined) ?? null,
      notes: (payload.notes as string | null | undefined) ?? null,
      createdBy: actor.id,
      updatedBy: actor.id,
    })
    await auditLogService.log({
      organizationId: actor.organizationId,
      actorUserId: actor.id,
      action: 'procurement.rfq.create',
      entityType: 'procurement_rfq',
      entityId: rfq.id,
      metadata: { method, recommended, estimated, tor: ['FIN-012', 'FIN-015', 'FIN-026'] },
    })
    return rfq
  }

  async transitionRfq(actor: Actor, id: string, next: 'issued' | 'closed') {
    const rfq = await ProcurementRfq.query()
      .where('organizationId', actor.organizationId)
      .where('id', id)
      .first()
    if (!rfq) throw Object.assign(new Error('RFQ not found'), { status: 404 })

    if (next === 'issued') {
      if (rfq.status !== 'draft') throw Object.assign(new Error('Only draft RFQs can be issued'), { status: 422 })
      rfq.merge({ status: 'issued', issuedAt: DateTime.now(), updatedBy: actor.id })
    } else {
      if (rfq.status !== 'issued') throw Object.assign(new Error('Only issued RFQs can be closed'), { status: 422 })
      rfq.merge({ status: 'closed', closedAt: DateTime.now(), updatedBy: actor.id })
    }
    await rfq.save()
    await auditLogService.log({
      organizationId: actor.organizationId,
      actorUserId: actor.id,
      action: `procurement.rfq.${next}`,
      entityType: 'procurement_rfq',
      entityId: rfq.id,
      metadata: { tor: 'FIN-012' },
    })
    return rfq
  }

  async listRfqs(organizationId: string, filters: { status?: string; page?: number; limit?: number }) {
    const page = filters.page ?? 1
    const limit = Math.min(filters.limit ?? 50, 100)
    const q = ProcurementRfq.query().where('organizationId', organizationId).orderBy('createdAt', 'desc')
    if (filters.status) q.where('status', filters.status)
    return q.paginate(page, limit)
  }

  async addQuotation(actor: Actor, payload: Record<string, unknown>) {
    const rfq = await ProcurementRfq.query()
      .where('organizationId', actor.organizationId)
      .where('id', String(payload.rfqId))
      .first()
    if (!rfq) throw Object.assign(new Error('RFQ not found'), { status: 404 })
    if (rfq.status !== 'issued') {
      throw Object.assign(new Error('Quotations can only be recorded against issued RFQs'), { status: 422 })
    }
    const supplier = await assertSupplier(actor.organizationId, String(payload.supplierId))
    const row = await ProcurementQuotation.create({
      organizationId: actor.organizationId,
      rfqId: rfq.id,
      supplierId: supplier.id,
      quotationRef: (payload.quotationRef as string | null | undefined) ?? null,
      amount: moneyOrZero(payload.amount),
      submittedAt: payload.submittedAt ? toDateTime(payload.submittedAt) : DateTime.now(),
      notes: (payload.notes as string | null | undefined) ?? null,
    })
    await auditLogService.log({
      organizationId: actor.organizationId,
      actorUserId: actor.id,
      action: 'procurement.quotation.create',
      entityType: 'procurement_quotation',
      entityId: row.id,
      metadata: { rfqId: rfq.id, supplierId: supplier.id, tor: 'FIN-012' },
    })
    return row
  }

  async createAbstract(actor: Actor, payload: Record<string, unknown>) {
    const rfq = await ProcurementRfq.query()
      .where('organizationId', actor.organizationId)
      .where('id', String(payload.rfqId))
      .first()
    if (!rfq) throw Object.assign(new Error('RFQ not found'), { status: 404 })

    const quotationIds = (payload.quotationIds as string[] | undefined) ?? []
    if (!quotationIds.length) {
      throw Object.assign(new Error('Abstract requires at least one quotation'), { status: 422 })
    }

    const quotations = await ProcurementQuotation.query()
      .where('organizationId', actor.organizationId)
      .where('rfqId', rfq.id)
      .whereIn('id', quotationIds)
    if (quotations.length !== quotationIds.length) {
      throw Object.assign(new Error('One or more quotations are invalid for this RFQ'), { status: 422 })
    }

    const created = await db.transaction(async (trx) => {
      const header = await ProcurementAbstract.create(
        {
          organizationId: actor.organizationId,
          rfqId: rfq.id,
          abstractNumber: String(payload.abstractNumber ?? '').trim() || seq('AOQ'),
          status: 'prepared',
          notes: (payload.notes as string | null | undefined) ?? null,
          preparedAt: DateTime.now(),
          preparedBy: actor.id,
        },
        { client: trx }
      )
      let lineNo = 1
      for (const quotationId of quotationIds) {
        await ProcurementAbstractLine.create(
          {
            organizationId: actor.organizationId,
            abstractId: header.id,
            quotationId,
            lineNo: lineNo++,
            remarks: null,
          },
          { client: trx }
        )
      }
      await header.useTransaction(trx).load('lines')
      return header
    })

    await auditLogService.log({
      organizationId: actor.organizationId,
      actorUserId: actor.id,
      action: 'procurement.abstract.create',
      entityType: 'procurement_abstract',
      entityId: created.id,
      metadata: { rfqId: rfq.id, tor: 'FIN-012' },
    })
    return created
  }

  async createAward(actor: Actor, payload: Record<string, unknown>) {
    const quotation = await ProcurementQuotation.query()
      .where('organizationId', actor.organizationId)
      .where('id', String(payload.quotationId))
      .first()
    if (!quotation) throw Object.assign(new Error('Quotation not found'), { status: 404 })

    if (payload.abstractId) {
      const abs = await ProcurementAbstract.query()
        .where('organizationId', actor.organizationId)
        .where('id', String(payload.abstractId))
        .where('rfqId', quotation.rfqId)
        .first()
      if (!abs) throw Object.assign(new Error('Abstract not found for this RFQ'), { status: 422 })
    }

    const award = await ProcurementAward.create({
      organizationId: actor.organizationId,
      rfqId: quotation.rfqId,
      abstractId: (payload.abstractId as string | null | undefined) ?? null,
      quotationId: quotation.id,
      supplierId: quotation.supplierId,
      awardedAmount: moneyOrZero(payload.awardedAmount ?? quotation.amount),
      philgepsReference: (payload.philgepsReference as string | null | undefined) ?? null,
      status: 'awarded',
      awardedAt: DateTime.now(),
      awardedBy: actor.id,
      notes: (payload.notes as string | null | undefined) ?? null,
    })
    await auditLogService.log({
      organizationId: actor.organizationId,
      actorUserId: actor.id,
      action: 'procurement.award.create',
      entityType: 'procurement_award',
      entityId: award.id,
      metadata: { tor: ['FIN-012', 'FIN-026'] },
    })
    return award
  }

  async listPurchaseOrders(
    organizationId: string,
    filters: { status?: string; page?: number; limit?: number }
  ) {
    const page = filters.page ?? 1
    const limit = Math.min(filters.limit ?? 50, 100)
    const q = PurchaseOrder.query().where('organizationId', organizationId).orderBy('createdAt', 'desc')
    if (filters.status) q.where('status', filters.status)
    return q.paginate(page, limit)
  }

  async getPurchaseOrder(organizationId: string, id: string) {
    const row = await PurchaseOrder.query()
      .where('organizationId', organizationId)
      .where('id', id)
      .preload('lines', (q) => q.orderBy('lineNo', 'asc'))
      .first()
    if (!row) throw Object.assign(new Error('Purchase order not found'), { status: 404 })
    return row
  }

  async createPurchaseOrder(actor: Actor, payload: Record<string, unknown>) {
    let supplierId = (payload.supplierId as string | null | undefined) ?? null
    let supplierName = (payload.supplierName as string | null | undefined) ?? null
    let prId = (payload.prId as string | null | undefined) ?? null
    let awardId = (payload.awardId as string | null | undefined) ?? null
    let totalAmount = payload.totalAmount !== undefined ? moneyOrZero(payload.totalAmount) : null
    let philgepsReference = (payload.philgepsReference as string | null | undefined) ?? null
    let fiscalYear = (payload.fiscalYear as string | null | undefined) ?? null

    if (awardId) {
      const award = await ProcurementAward.query()
        .where('organizationId', actor.organizationId)
        .where('id', awardId)
        .first()
      if (!award) throw Object.assign(new Error('Award not found'), { status: 422 })
      supplierId = award.supplierId
      totalAmount = totalAmount ?? award.awardedAmount
      philgepsReference = philgepsReference ?? award.philgepsReference
      const rfq = await ProcurementRfq.find(award.rfqId)
      if (rfq) prId = prId ?? rfq.purchaseRequisitionId
    }

    if (supplierId) {
      const supplier = await assertSupplier(actor.organizationId, supplierId)
      supplierName = supplierName ?? supplier.name
    }
    if (!supplierName && !supplierId) {
      throw Object.assign(new Error('supplierId or supplierName is required'), { status: 422 })
    }
    if (!totalAmount) throw Object.assign(new Error('totalAmount is required'), { status: 422 })

    const linesInput = (payload.lines as Array<Record<string, unknown>> | undefined) ?? []
    const lines =
      linesInput.length > 0
        ? linesInput.map((line, index) => {
            const qty = String(line.quantity ?? 1)
            const unitCost = moneyOrZero(line.unitCost)
            const lineAmount =
              line.lineAmount !== undefined
                ? moneyOrZero(line.lineAmount)
                : fromCents((toCents(qty) * toCents(unitCost)) / 100n)
            return {
              lineNo: index + 1,
              description: String(line.description),
              quantity: qty,
              uom: (line.uom as string | null | undefined) ?? null,
              unitCost,
              lineAmount,
            }
          })
        : [
            {
              lineNo: 1,
              description: String(payload.description ?? 'Purchase order'),
              quantity: '1',
              uom: null as string | null,
              unitCost: totalAmount,
              lineAmount: totalAmount,
            },
          ]

    const created = await db.transaction(async (trx) => {
      const header = await PurchaseOrder.create(
        {
          organizationId: actor.organizationId,
          poNumber: String(payload.poNumber ?? '').trim() || seq('PO'),
          prId,
          supplierName,
          supplierId,
          awardId,
          totalAmount,
          terms: (payload.terms as string | null | undefined) ?? null,
          status: 'draft',
          philgepsReference,
          contractNumber: (payload.contractNumber as string | null | undefined) ?? null,
          fiscalYear,
          createdBy: actor.id,
          updatedBy: actor.id,
        },
        { client: trx }
      )
      for (const line of lines) {
        await PurchaseOrderLine.create(
          {
            organizationId: actor.organizationId,
            purchaseOrderId: header.id,
            ...line,
          },
          { client: trx }
        )
      }
      await header.useTransaction(trx).load('lines')
      return header
    })

    await auditLogService.log({
      organizationId: actor.organizationId,
      actorUserId: actor.id,
      action: 'procurement.po.create',
      entityType: 'purchase_order',
      entityId: created.id,
      metadata: { poNumber: created.poNumber, tor: ['FIN-012', 'FIN-014'] },
    })
    return created
  }

  async transitionPurchaseOrder(actor: Actor, id: string, next: 'approved' | 'issued') {
    const po = await this.getPurchaseOrder(actor.organizationId, id)
    if (next === 'approved') {
      if (po.status !== 'draft') throw Object.assign(new Error('Only draft POs can be approved'), { status: 422 })
      po.merge({
        status: 'approved',
        approvedAt: DateTime.now(),
        approvedBy: actor.id,
        updatedBy: actor.id,
      })
    } else {
      if (po.status !== 'approved') throw Object.assign(new Error('Only approved POs can be issued'), { status: 422 })
      po.merge({ status: 'issued', issuedAt: DateTime.now(), updatedBy: actor.id })
    }
    await po.save()
    await auditLogService.log({
      organizationId: actor.organizationId,
      actorUserId: actor.id,
      action: `procurement.po.${next}`,
      entityType: 'purchase_order',
      entityId: po.id,
      metadata: { tor: 'FIN-014' },
    })
    return po
  }

  async recordDelivery(actor: Actor, payload: Record<string, unknown>) {
    const po = await this.getPurchaseOrder(actor.organizationId, String(payload.purchaseOrderId))
    if (po.status !== 'issued' && po.status !== 'partially_received') {
      throw Object.assign(new Error('Deliveries require an issued purchase order'), { status: 422 })
    }
    const linesInput = (payload.lines as Array<Record<string, unknown>> | undefined) ?? []
    if (!linesInput.length) {
      throw Object.assign(new Error('Delivery requires at least one line'), { status: 422 })
    }

    const created = await db.transaction(async (trx) => {
      const header = await ProcurementDelivery.create(
        {
          organizationId: actor.organizationId,
          purchaseOrderId: po.id,
          deliveryNumber: String(payload.deliveryNumber ?? '').trim() || seq('DLV'),
          deliveredOn: payload.deliveredOn ? toDateTime(payload.deliveredOn) : DateTime.now(),
          status: 'recorded',
          notes: (payload.notes as string | null | undefined) ?? null,
          receivedBy: actor.id,
        },
        { client: trx }
      )
      let lineNo = 1
      for (const line of linesInput) {
        if (line.purchaseOrderLineId) {
          const poLine = await PurchaseOrderLine.query({ client: trx })
            .where('organizationId', actor.organizationId)
            .where('purchaseOrderId', po.id)
            .where('id', String(line.purchaseOrderLineId))
            .first()
          if (!poLine) throw Object.assign(new Error('Invalid purchase order line'), { status: 422 })
        }
        await ProcurementDeliveryLine.create(
          {
            organizationId: actor.organizationId,
            deliveryId: header.id,
            purchaseOrderLineId: (line.purchaseOrderLineId as string | null | undefined) ?? null,
            lineNo: lineNo++,
            quantityDelivered: String(line.quantityDelivered),
            conditionNotes: (line.conditionNotes as string | null | undefined) ?? null,
          },
          { client: trx }
        )
      }
      po.useTransaction(trx)
      po.merge({ status: 'partially_received', updatedBy: actor.id })
      await po.save()
      await header.useTransaction(trx).load('lines')
      return header
    })

    await auditLogService.log({
      organizationId: actor.organizationId,
      actorUserId: actor.id,
      action: 'procurement.delivery.create',
      entityType: 'procurement_delivery',
      entityId: created.id,
      metadata: { poId: po.id, tor: ['FIN-015', 'FIN-026'] },
    })
    return created
  }

  async issueIar(actor: Actor, payload: Record<string, unknown>) {
    const po = await this.getPurchaseOrder(actor.organizationId, String(payload.purchaseOrderId))
    const delivery = await ProcurementDelivery.query()
      .where('organizationId', actor.organizationId)
      .where('id', String(payload.deliveryId))
      .where('purchaseOrderId', po.id)
      .preload('lines')
      .first()
    if (!delivery) throw Object.assign(new Error('Delivery not found for this PO'), { status: 422 })

    const result = String(payload.result ?? 'accepted')
    if (!IAR_RESULTS.has(result)) {
      throw Object.assign(new Error('IAR result must be accepted, rejected, or partial'), { status: 422 })
    }

    const created = await db.transaction(async (trx) => {
      const iar = await InspectionAcceptanceReport.create(
        {
          organizationId: actor.organizationId,
          purchaseOrderId: po.id,
          deliveryId: delivery.id,
          iarNumber: String(payload.iarNumber ?? '').trim() || seq('IAR'),
          result,
          status: 'issued',
          notes: (payload.notes as string | null | undefined) ?? null,
          inspectedAt: DateTime.now(),
          inspectedBy: actor.id,
          uimsSyncStatus: result === 'accepted' || result === 'partial' ? 'pending' : 'not_required',
        },
        { client: trx }
      )

      if (result === 'accepted') {
        po.useTransaction(trx)
        po.merge({ status: 'received', updatedBy: actor.id })
        await po.save()
      }

      if (result === 'accepted' || result === 'partial') {
        await ProcurementUimsEvent.create(
          {
            organizationId: actor.organizationId,
            iarId: iar.id,
            purchaseOrderId: po.id,
            eventType: 'acceptance',
            status: 'pending',
            payload: {
              tor: ['FIN-014', 'FIN-026'],
              poNumber: po.poNumber,
              iarNumber: iar.iarNumber,
              result,
              supplierId: po.supplierId,
              lines: delivery.lines.map((l) => ({
                purchaseOrderLineId: l.purchaseOrderLineId,
                quantityDelivered: l.quantityDelivered,
                conditionNotes: l.conditionNotes,
              })),
              note: 'UIMS M2M contract versions For Clarification — event queued locally',
            },
          },
          { client: trx }
        )
      }
      return iar
    })

    await auditLogService.log({
      organizationId: actor.organizationId,
      actorUserId: actor.id,
      action: 'procurement.iar.issue',
      entityType: 'inspection_acceptance_report',
      entityId: created.id,
      metadata: { result, tor: ['FIN-015', 'FIN-026'] },
    })
    return created
  }

  async listIars(organizationId: string, filters: { page?: number; limit?: number }) {
    const page = filters.page ?? 1
    const limit = Math.min(filters.limit ?? 50, 100)
    return InspectionAcceptanceReport.query()
      .where('organizationId', organizationId)
      .orderBy('createdAt', 'desc')
      .paginate(page, limit)
  }

  async monitor(organizationId: string) {
    const [prs, rfqs, pos, iars, pendingUims] = await Promise.all([
      PurchaseRequisition.query().where('organizationId', organizationId).count('* as total'),
      ProcurementRfq.query().where('organizationId', organizationId).count('* as total'),
      PurchaseOrder.query().where('organizationId', organizationId).count('* as total'),
      InspectionAcceptanceReport.query().where('organizationId', organizationId).count('* as total'),
      ProcurementUimsEvent.query()
        .where('organizationId', organizationId)
        .where('status', 'pending')
        .count('* as total'),
    ])
    const countOf = (rows: Array<{ $extras: { total: string } }>) => Number(rows[0]?.$extras?.total ?? 0)
    return {
      purchaseRequisitions: countOf(prs as any),
      rfqs: countOf(rfqs as any),
      purchaseOrders: countOf(pos as any),
      iars: countOf(iars as any),
      pendingUimsEvents: countOf(pendingUims as any),
      tor: ['FIN-012', 'FIN-014', 'FIN-015', 'FIN-026'],
      note: 'Payment / three-way AP (FIN-016) deferred to Package E',
    }
  }

  async addDocumentRef(actor: Actor, payload: Record<string, unknown>) {
    const row = await ProcurementDocumentRef.create({
      organizationId: actor.organizationId,
      entityType: String(payload.entityType),
      entityId: String(payload.entityId),
      category: String(payload.category),
      fileName: String(payload.fileName),
      externalRef: (payload.externalRef as string | null | undefined) ?? null,
      mimeType: (payload.mimeType as string | null | undefined) ?? null,
      sizeBytes: payload.sizeBytes !== undefined ? Number(payload.sizeBytes) : null,
      uploadedBy: actor.id,
    })
    await auditLogService.log({
      organizationId: actor.organizationId,
      actorUserId: actor.id,
      action: 'procurement.document_ref.create',
      entityType: 'procurement_document_ref',
      entityId: row.id,
      metadata: { entityType: row.entityType, category: row.category, tor: 'FIN-013' },
    })
    return row
  }

  async listDocumentRefs(
    organizationId: string,
    filters: { entityType?: string; entityId?: string; page?: number; limit?: number }
  ) {
    const page = filters.page ?? 1
    const limit = Math.min(filters.limit ?? 50, 100)
    const q = ProcurementDocumentRef.query()
      .where('organizationId', organizationId)
      .orderBy('createdAt', 'desc')
    if (filters.entityType) q.where('entityType', filters.entityType)
    if (filters.entityId) q.where('entityId', filters.entityId)
    return q.paginate(page, limit)
  }
}

export const procurementService = new ProcurementService()
