import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'
import FinancialPlan from '#modules/finance/models/financial_plan'
import FinancialPlanLine from '#modules/finance/models/financial_plan_line'
import BudgetDocument from '#modules/finance/models/budget_document'
import BudgetDocumentLine from '#modules/finance/models/budget_document_line'
import BudgetLine from '#modules/finance/models/budget_line'
import BudgetObligation from '#modules/finance/models/budget_obligation'
import Fund from '#modules/finance/models/fund'
import ChartOfAccount from '#modules/finance/models/chart_of_account'
import { auditLogService } from '#modules/finance/services/audit_log_service'
import { addMoney, cmpMoney, fromCents, subMoney, toCents } from '#modules/finance/helpers/money'

type Actor = { id: string; organizationId: string }

const PLAN_TYPES = new Set(['app', 'wfp'])
const DOC_TYPES = new Set(['annual', 'supplemental', 'realignment', 'adjustment'])
const OBLIGATION_KINDS = new Set(['ors', 'burs', 'other'])
const EFFECTS = new Set(['increase', 'decrease'])

function assertPositiveAmount(amount: string | number) {
  if (cmpMoney(amount, 0) <= 0) {
    throw Object.assign(new Error('Amount must be greater than zero'), { status: 422 })
  }
}

function assertTransition(from: string, to: string, allowed: Record<string, string[]>) {
  if (!(allowed[from] ?? []).includes(to)) {
    throw Object.assign(new Error(`Invalid status transition from ${from} to ${to}`), { status: 422 })
  }
}

async function assertFund(orgId: string, fundId: string) {
  const fund = await Fund.query().where('id', fundId).where('organizationId', orgId).first()
  if (!fund) throw Object.assign(new Error('Fund not found in organization'), { status: 422 })
  return fund
}

async function assertAccount(orgId: string, accountId: string) {
  const account = await ChartOfAccount.query()
    .where('id', accountId)
    .where('organizationId', orgId)
    .first()
  if (!account) throw Object.assign(new Error('Account not found in organization'), { status: 422 })
  return account
}

async function findOrCreateBudgetLine(
  trx: any,
  orgId: string,
  fundId: string,
  accountId: string,
  fiscalYear: string,
  uacsCode: string | null,
  actorId: string
) {
  let line = await BudgetLine.query({ client: trx })
    .where('organizationId', orgId)
    .where('fundId', fundId)
    .where('accountId', accountId)
    .where('fiscalYear', fiscalYear)
    .first()

  if (!line) {
    line = await BudgetLine.create(
      {
        organizationId: orgId,
        fundId,
        accountId,
        fiscalYear,
        allocatedAmount: '0.00',
        utilizedAmount: '0.00',
        obligatedAmount: '0.00',
        uacsCode,
        createdBy: actorId,
        updatedBy: actorId,
      },
      { client: trx }
    )
  }
  return line
}

export class BudgetService {
  async listPlans(organizationId: string, filters: { planType?: string; fiscalYear?: string; status?: string; page?: number; limit?: number }) {
    const page = filters.page ?? 1
    const limit = Math.min(filters.limit ?? 50, 100)
    const q = FinancialPlan.query().where('organizationId', organizationId).orderBy('createdAt', 'desc')
    if (filters.planType) q.where('planType', filters.planType)
    if (filters.fiscalYear) q.where('fiscalYear', filters.fiscalYear)
    if (filters.status) q.where('status', filters.status)
    return q.paginate(page, limit)
  }

  async getPlan(organizationId: string, id: string) {
    const plan = await FinancialPlan.query()
      .where('organizationId', organizationId)
      .where('id', id)
      .preload('lines', (q) => q.orderBy('lineNo', 'asc'))
      .first()
    if (!plan) throw Object.assign(new Error('Financial plan not found'), { status: 404 })
    return plan
  }

  async createPlan(actor: Actor, payload: Record<string, unknown>) {
    const planType = String(payload.planType)
    if (!PLAN_TYPES.has(planType)) {
      throw Object.assign(new Error('planType must be app or wfp'), { status: 422 })
    }

    const plan = await db.transaction(async (trx) => {
      const created = await FinancialPlan.create(
        {
          organizationId: actor.organizationId,
          planType,
          fiscalPeriodId: (payload.fiscalPeriodId as string | null | undefined) ?? null,
          fiscalYear: String(payload.fiscalYear),
          title: String(payload.title),
          description: (payload.description as string | null | undefined) ?? null,
          status: 'draft',
          createdBy: actor.id,
          updatedBy: actor.id,
        },
        { client: trx }
      )

      const lines = (payload.lines as Array<Record<string, unknown>> | undefined) ?? []
      let lineNo = 1
      for (const line of lines) {
        if (line.fundId) await assertFund(actor.organizationId, String(line.fundId))
        if (line.accountId) await assertAccount(actor.organizationId, String(line.accountId))
        const amount = String(line.amount ?? 0)
        if (cmpMoney(amount, 0) < 0) {
          throw Object.assign(new Error('Plan line amount cannot be negative'), { status: 422 })
        }
        await FinancialPlanLine.create(
          {
            organizationId: actor.organizationId,
            planId: created.id,
            lineNo: lineNo++,
            description: String(line.description),
            fundId: (line.fundId as string | null | undefined) ?? null,
            accountId: (line.accountId as string | null | undefined) ?? null,
            amount,
            remarks: (line.remarks as string | null | undefined) ?? null,
          },
          { client: trx }
        )
      }

      await created.useTransaction(trx).load('lines')
      return created
    })

    await auditLogService.log({
      organizationId: actor.organizationId,
      actorUserId: actor.id,
      action: 'create',
      entityType: 'financial_plans',
      entityId: plan.id,
      metadata: { after: plan.serialize(), tor: 'FIN-001' },
    })
    return plan
  }

  async updatePlan(actor: Actor, id: string, payload: Record<string, unknown>) {
    const plan = await this.getPlan(actor.organizationId, id)
    if (plan.status !== 'draft') {
      throw Object.assign(new Error('Only draft plans can be updated'), { status: 422 })
    }
    const before = plan.serialize()

    await db.transaction(async (trx) => {
      plan.useTransaction(trx)
      if (payload.title !== undefined) plan.title = String(payload.title)
      if (payload.description !== undefined) plan.description = (payload.description as string | null) ?? null
      if (payload.fiscalPeriodId !== undefined) {
        plan.fiscalPeriodId = (payload.fiscalPeriodId as string | null) ?? null
      }
      if (payload.fiscalYear !== undefined) plan.fiscalYear = String(payload.fiscalYear)
      plan.updatedBy = actor.id
      await plan.save()

      if (payload.lines) {
        await FinancialPlanLine.query({ client: trx }).where('planId', plan.id).delete()
        let lineNo = 1
        for (const line of payload.lines as Array<Record<string, unknown>>) {
          if (line.fundId) await assertFund(actor.organizationId, String(line.fundId))
          if (line.accountId) await assertAccount(actor.organizationId, String(line.accountId))
          const amount = String(line.amount ?? 0)
          if (cmpMoney(amount, 0) < 0) {
            throw Object.assign(new Error('Plan line amount cannot be negative'), { status: 422 })
          }
          await FinancialPlanLine.create(
            {
              organizationId: actor.organizationId,
              planId: plan.id,
              lineNo: lineNo++,
              description: String(line.description),
              fundId: (line.fundId as string | null | undefined) ?? null,
              accountId: (line.accountId as string | null | undefined) ?? null,
              amount,
              remarks: (line.remarks as string | null | undefined) ?? null,
            },
            { client: trx }
          )
        }
      }
    })

    const updated = await this.getPlan(actor.organizationId, id)
    await auditLogService.log({
      organizationId: actor.organizationId,
      actorUserId: actor.id,
      action: 'update',
      entityType: 'financial_plans',
      entityId: id,
      metadata: { before, after: updated.serialize(), tor: 'FIN-001' },
    })
    return updated
  }

  async transitionPlan(actor: Actor, id: string, to: 'submitted' | 'approved' | 'rejected' | 'draft', reason?: string) {
    const plan = await this.getPlan(actor.organizationId, id)
    const before = plan.serialize()
    assertTransition(plan.status, to, {
      draft: ['submitted'],
      submitted: ['approved', 'rejected'],
      rejected: ['draft'],
    })

    if (to === 'rejected' && !reason) {
      throw Object.assign(new Error('rejectionReason is required'), { status: 422 })
    }

    plan.status = to
    plan.updatedBy = actor.id
    if (to === 'submitted') {
      plan.submittedAt = DateTime.utc()
      plan.submittedBy = actor.id
      plan.rejectionReason = null
    }
    if (to === 'approved' || to === 'rejected') {
      plan.reviewedAt = DateTime.utc()
      plan.reviewedBy = actor.id
      plan.rejectionReason = to === 'rejected' ? String(reason) : null
    }
    if (to === 'draft') {
      plan.submittedAt = null
      plan.submittedBy = null
      plan.reviewedAt = null
      plan.reviewedBy = null
      plan.rejectionReason = null
    }
    await plan.save()

    await auditLogService.log({
      organizationId: actor.organizationId,
      actorUserId: actor.id,
      action: to,
      entityType: 'financial_plans',
      entityId: id,
      metadata: { before, after: plan.serialize(), tor: 'FIN-001' },
    })
    return this.getPlan(actor.organizationId, id)
  }

  async listDocuments(
    organizationId: string,
    filters: { documentType?: string; fiscalYear?: string; status?: string; page?: number; limit?: number }
  ) {
    const page = filters.page ?? 1
    const limit = Math.min(filters.limit ?? 50, 100)
    const q = BudgetDocument.query().where('organizationId', organizationId).orderBy('createdAt', 'desc')
    if (filters.documentType) q.where('documentType', filters.documentType)
    if (filters.fiscalYear) q.where('fiscalYear', filters.fiscalYear)
    if (filters.status) q.where('status', filters.status)
    return q.paginate(page, limit)
  }

  async getDocument(organizationId: string, id: string) {
    const doc = await BudgetDocument.query()
      .where('organizationId', organizationId)
      .where('id', id)
      .preload('lines', (q) => q.orderBy('lineNo', 'asc'))
      .first()
    if (!doc) throw Object.assign(new Error('Budget document not found'), { status: 404 })
    return doc
  }

  async createDocument(actor: Actor, payload: Record<string, unknown>) {
    const documentType = String(payload.documentType)
    if (!DOC_TYPES.has(documentType)) {
      throw Object.assign(new Error('Invalid documentType'), { status: 422 })
    }
    const lines = (payload.lines as Array<Record<string, unknown>> | undefined) ?? []
    if (lines.length === 0) {
      throw Object.assign(new Error('At least one budget line is required'), { status: 422 })
    }

    const doc = await db.transaction(async (trx) => {
      const created = await BudgetDocument.create(
        {
          organizationId: actor.organizationId,
          documentType,
          fiscalPeriodId: (payload.fiscalPeriodId as string | null | undefined) ?? null,
          fiscalYear: String(payload.fiscalYear),
          title: String(payload.title),
          description: (payload.description as string | null | undefined) ?? null,
          sourcePlanId: (payload.sourcePlanId as string | null | undefined) ?? null,
          status: 'draft',
          createdBy: actor.id,
          updatedBy: actor.id,
        },
        { client: trx }
      )

      let lineNo = 1
      for (const line of lines) {
        await assertFund(actor.organizationId, String(line.fundId))
        const account = await assertAccount(actor.organizationId, String(line.accountId))
        const effect = String(line.effect ?? 'increase')
        if (!EFFECTS.has(effect)) {
          throw Object.assign(new Error('effect must be increase or decrease'), { status: 422 })
        }
        assertPositiveAmount(String(line.amount))
        await BudgetDocumentLine.create(
          {
            organizationId: actor.organizationId,
            documentId: created.id,
            lineNo: lineNo++,
            fundId: String(line.fundId),
            accountId: String(line.accountId),
            uacsCode: (line.uacsCode as string | null | undefined) ?? account.uacsCode,
            effect,
            amount: String(line.amount),
            remarks: (line.remarks as string | null | undefined) ?? null,
          },
          { client: trx }
        )
      }

      await created.useTransaction(trx).load('lines')
      return created
    })

    await auditLogService.log({
      organizationId: actor.organizationId,
      actorUserId: actor.id,
      action: 'create',
      entityType: 'budget_documents',
      entityId: doc.id,
      metadata: { after: doc.serialize(), tor: documentType === 'annual' ? 'FIN-002' : 'FIN-004' },
    })
    return doc
  }

  async transitionDocument(
    actor: Actor,
    id: string,
    to: 'submitted' | 'approved' | 'rejected' | 'draft',
    reason?: string
  ) {
    const doc = await this.getDocument(actor.organizationId, id)
    const before = doc.serialize()
    assertTransition(doc.status, to, {
      draft: ['submitted'],
      submitted: ['approved', 'rejected'],
      rejected: ['draft'],
    })
    if (to === 'rejected' && !reason) {
      throw Object.assign(new Error('rejectionReason is required'), { status: 422 })
    }

    if (to === 'approved') {
      await db.transaction(async (trx) => {
        for (const line of doc.lines) {
          const budgetLine = await findOrCreateBudgetLine(
            trx,
            actor.organizationId,
            line.fundId,
            line.accountId,
            doc.fiscalYear,
            line.uacsCode,
            actor.id
          )
          budgetLine.useTransaction(trx)
          if (line.effect === 'increase') {
            budgetLine.allocatedAmount = addMoney(budgetLine.allocatedAmount, line.amount)
          } else {
            const next = subMoney(budgetLine.allocatedAmount, line.amount)
            const reserved = addMoney(budgetLine.obligatedAmount, budgetLine.utilizedAmount)
            if (cmpMoney(next, reserved) < 0) {
              throw Object.assign(
                new Error('Decrease would bring allocation below obligated/utilized amount'),
                { status: 422 }
              )
            }
            budgetLine.allocatedAmount = next
          }
          budgetLine.updatedBy = actor.id
          if (line.uacsCode) budgetLine.uacsCode = line.uacsCode
          await budgetLine.save()
        }

        doc.useTransaction(trx)
        doc.status = 'approved'
        doc.reviewedAt = DateTime.utc()
        doc.reviewedBy = actor.id
        doc.rejectionReason = null
        doc.updatedBy = actor.id
        await doc.save()
      })
    } else {
      doc.status = to
      doc.updatedBy = actor.id
      if (to === 'submitted') {
        doc.submittedAt = DateTime.utc()
        doc.submittedBy = actor.id
        doc.rejectionReason = null
      }
      if (to === 'rejected') {
        doc.reviewedAt = DateTime.utc()
        doc.reviewedBy = actor.id
        doc.rejectionReason = String(reason)
      }
      if (to === 'draft') {
        doc.submittedAt = null
        doc.submittedBy = null
        doc.reviewedAt = null
        doc.reviewedBy = null
        doc.rejectionReason = null
      }
      await doc.save()
    }

    const after = await this.getDocument(actor.organizationId, id)
    await auditLogService.log({
      organizationId: actor.organizationId,
      actorUserId: actor.id,
      action: to,
      entityType: 'budget_documents',
      entityId: id,
      metadata: {
        before,
        after: after.serialize(),
        tor: doc.documentType === 'annual' ? 'FIN-002' : 'FIN-004',
      },
    })
    return after
  }

  async listObligations(
    organizationId: string,
    filters: { fiscalYear?: string; status?: string; page?: number; limit?: number }
  ) {
    const page = filters.page ?? 1
    const limit = Math.min(filters.limit ?? 50, 100)
    const q = BudgetObligation.query().where('organizationId', organizationId).orderBy('createdAt', 'desc')
    if (filters.fiscalYear) q.where('fiscalYear', filters.fiscalYear)
    if (filters.status) q.where('status', filters.status)
    return q.paginate(page, limit)
  }

  async getObligation(organizationId: string, id: string) {
    const row = await BudgetObligation.query()
      .where('organizationId', organizationId)
      .where('id', id)
      .first()
    if (!row) throw Object.assign(new Error('Obligation not found'), { status: 404 })
    return row
  }

  async createObligation(actor: Actor, payload: Record<string, unknown>) {
    const documentKind = String(payload.documentKind)
    if (!OBLIGATION_KINDS.has(documentKind)) {
      throw Object.assign(new Error('documentKind must be ors, burs, or other'), { status: 422 })
    }
    await assertFund(actor.organizationId, String(payload.fundId))
    await assertAccount(actor.organizationId, String(payload.accountId))
    assertPositiveAmount(String(payload.amount))

    const row = await BudgetObligation.create({
      organizationId: actor.organizationId,
      documentKind,
      documentNumber: String(payload.documentNumber),
      fiscalYear: String(payload.fiscalYear),
      fundId: String(payload.fundId),
      accountId: String(payload.accountId),
      amount: String(payload.amount),
      particulars: (payload.particulars as string | null | undefined) ?? null,
      status: 'draft',
      createdBy: actor.id,
      updatedBy: actor.id,
    })

    await auditLogService.log({
      organizationId: actor.organizationId,
      actorUserId: actor.id,
      action: 'create',
      entityType: 'budget_obligations',
      entityId: row.id,
      metadata: { after: row.serialize(), tor: 'FIN-003' },
    })
    return row
  }

  async postObligation(actor: Actor, id: string) {
    const row = await this.getObligation(actor.organizationId, id)
    if (row.status !== 'draft') {
      throw Object.assign(new Error('Only draft obligations can be posted'), { status: 422 })
    }
    const before = row.serialize()

    await db.transaction(async (trx) => {
      const line = await findOrCreateBudgetLine(
        trx,
        actor.organizationId,
        row.fundId,
        row.accountId,
        row.fiscalYear,
        null,
        actor.id
      )
      const available = subMoney(line.allocatedAmount, addMoney(line.obligatedAmount, line.utilizedAmount))
      if (cmpMoney(row.amount, available) > 0) {
        throw Object.assign(
          new Error(`Insufficient available allotment (${available}) for obligation ${row.amount}`),
          { status: 422 }
        )
      }
      line.useTransaction(trx)
      line.obligatedAmount = addMoney(line.obligatedAmount, row.amount)
      line.updatedBy = actor.id
      await line.save()

      row.useTransaction(trx)
      row.status = 'posted'
      row.budgetLineId = line.id
      row.postedAt = DateTime.utc()
      row.postedBy = actor.id
      row.updatedBy = actor.id
      await row.save()
    })

    const after = await this.getObligation(actor.organizationId, id)
    await auditLogService.log({
      organizationId: actor.organizationId,
      actorUserId: actor.id,
      action: 'post',
      entityType: 'budget_obligations',
      entityId: id,
      metadata: { before, after: after.serialize(), tor: 'FIN-003' },
    })
    return after
  }

  async cancelObligation(actor: Actor, id: string) {
    const row = await this.getObligation(actor.organizationId, id)
    if (row.status !== 'posted') {
      throw Object.assign(new Error('Only posted obligations can be cancelled'), { status: 422 })
    }
    const before = row.serialize()

    await db.transaction(async (trx) => {
      if (row.budgetLineId) {
        const line = await BudgetLine.query({ client: trx }).where('id', row.budgetLineId).first()
        if (line) {
          line.useTransaction(trx)
          line.obligatedAmount = subMoney(line.obligatedAmount, row.amount)
          if (cmpMoney(line.obligatedAmount, 0) < 0) line.obligatedAmount = '0.00'
          line.updatedBy = actor.id
          await line.save()
        }
      }
      row.useTransaction(trx)
      row.status = 'cancelled'
      row.updatedBy = actor.id
      await row.save()
    })

    const after = await this.getObligation(actor.organizationId, id)
    await auditLogService.log({
      organizationId: actor.organizationId,
      actorUserId: actor.id,
      action: 'cancel',
      entityType: 'budget_obligations',
      entityId: id,
      metadata: { before, after: after.serialize(), tor: 'FIN-003' },
    })
    return after
  }

  async monitor(organizationId: string, fiscalYear: string) {
    const lines = await BudgetLine.query()
      .where('organizationId', organizationId)
      .where('fiscalYear', fiscalYear)
      .preload('fund')
      .preload('account')
      .orderBy('createdAt', 'asc')

    const rows = lines.map((line) => {
      const reserved = addMoney(line.obligatedAmount, line.utilizedAmount)
      const available = subMoney(line.allocatedAmount, reserved)
      return {
        id: line.id,
        fundId: line.fundId,
        fundCode: line.fund?.fundCode ?? null,
        accountId: line.accountId,
        accountCode: line.account?.accountCode ?? null,
        uacsCode: line.uacsCode ?? line.account?.uacsCode ?? null,
        fiscalYear: line.fiscalYear,
        allocatedAmount: line.allocatedAmount,
        obligatedAmount: line.obligatedAmount,
        utilizedAmount: line.utilizedAmount,
        availableAmount: available,
        calculation:
          'available = allocated_amount - (obligated_amount + utilized_amount); amounts from budget_lines',
      }
    })

    const totals = rows.reduce(
      (acc, row) => ({
        allocatedAmount: addMoney(acc.allocatedAmount, row.allocatedAmount),
        obligatedAmount: addMoney(acc.obligatedAmount, row.obligatedAmount),
        utilizedAmount: addMoney(acc.utilizedAmount, row.utilizedAmount),
        availableAmount: addMoney(acc.availableAmount, row.availableAmount),
      }),
      {
        allocatedAmount: '0.00',
        obligatedAmount: '0.00',
        utilizedAmount: '0.00',
        availableAmount: '0.00',
      }
    )

    return { fiscalYear, lines: rows, totals, tor: ['FIN-002', 'FIN-003', 'FIN-021'] }
  }

  async validateAvailability(
    organizationId: string,
    input: { fundId: string; accountId: string; fiscalYear: string; amount: string | number }
  ) {
    assertPositiveAmount(input.amount)
    await assertFund(organizationId, input.fundId)
    await assertAccount(organizationId, input.accountId)

    const line = await BudgetLine.query()
      .where('organizationId', organizationId)
      .where('fundId', input.fundId)
      .where('accountId', input.accountId)
      .where('fiscalYear', input.fiscalYear)
      .first()

    const allocated = line?.allocatedAmount ?? '0.00'
    const obligated = line?.obligatedAmount ?? '0.00'
    const utilized = line?.utilizedAmount ?? '0.00'
    const available = subMoney(allocated, addMoney(obligated, utilized))
    const requested = fromCents(toCents(input.amount))
    const sufficient = cmpMoney(requested, available) <= 0

    return {
      fundId: input.fundId,
      accountId: input.accountId,
      fiscalYear: input.fiscalYear,
      allocatedAmount: allocated,
      obligatedAmount: obligated,
      utilizedAmount: utilized,
      availableAmount: available,
      requestedAmount: requested,
      sufficient,
      enforcement: 'advisory',
      note: 'Hard vs soft stop on insufficient allotment is For Clarification (FIN-021). This endpoint returns sufficiency only.',
      calculation: 'available = allocated - (obligated + utilized)',
      tor: 'FIN-021',
    }
  }
}

export const budgetService = new BudgetService()
