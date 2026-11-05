import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'
import JournalEntry from '#modules/finance/models/journal_entry'
import JournalEntryLine from '#modules/finance/models/journal_entry_line'
import GeneralLedgerEntry from '#modules/finance/models/general_ledger_entry'
import FiscalPeriod from '#modules/finance/models/fiscal_period'
import Fund from '#modules/finance/models/fund'
import ChartOfAccount from '#modules/finance/models/chart_of_account'
import BudgetLine from '#modules/finance/models/budget_line'
import TaxWithholdingRate from '#modules/finance/models/tax_withholding_rate'
import TaxWithholdingEntry from '#modules/finance/models/tax_withholding_entry'
import BankAccount from '#modules/finance/models/bank_account'
import BankReconciliation from '#modules/finance/models/bank_reconciliation'
import BankReconciliationLine from '#modules/finance/models/bank_reconciliation_line'
import { auditLogService } from '#modules/finance/services/audit_log_service'
import { addMoney, cmpMoney, fromCents, toCents } from '#modules/finance/helpers/money'

type Actor = { id: string; organizationId: string }

const ENTRY_TYPES = new Set([
  'journal',
  'jev',
  'voucher_payable',
  'disbursement_cash',
  'disbursement_check',
  'bank_transaction',
])

function toDateTime(value: unknown): DateTime {
  if (DateTime.isDateTime(value)) return value
  if (value instanceof Date) return DateTime.fromJSDate(value)
  if (typeof value === 'string') {
    const parsed = DateTime.fromISO(value)
    if (parsed.isValid) return parsed
  }
  throw Object.assign(new Error('Invalid date value'), { status: 422 })
}

function moneyOrZero(v: unknown) {
  if (v === undefined || v === null || v === '') return '0.00'
  return fromCents(toCents(v as string | number))
}

async function assertOpenPeriod(organizationId: string, fiscalPeriodId: string | null, entryDate: DateTime) {
  if (fiscalPeriodId) {
    const period = await FiscalPeriod.query()
      .where('organizationId', organizationId)
      .where('id', fiscalPeriodId)
      .first()
    if (!period) throw Object.assign(new Error('Fiscal period not found'), { status: 422 })
    if (period.status === 'closed') {
      throw Object.assign(new Error('Cannot post to a closed fiscal period'), { status: 422 })
    }
    return period
  }

  const covering = await FiscalPeriod.query()
    .where('organizationId', organizationId)
    .where('status', 'open')
    .where('startsOn', '<=', entryDate.toISODate()!)
    .where('endsOn', '>=', entryDate.toISODate()!)
    .first()
  return covering
}

function validateBalanced(lines: Array<{ debitAmount: string; creditAmount: string }>) {
  let debits = '0.00'
  let credits = '0.00'
  for (const line of lines) {
    const d = moneyOrZero(line.debitAmount)
    const c = moneyOrZero(line.creditAmount)
    if (cmpMoney(d, 0) < 0 || cmpMoney(c, 0) < 0) {
      throw Object.assign(new Error('Debit and credit amounts cannot be negative'), { status: 422 })
    }
    if (cmpMoney(d, 0) > 0 && cmpMoney(c, 0) > 0) {
      throw Object.assign(new Error('A line cannot have both debit and credit'), { status: 422 })
    }
    if (cmpMoney(d, 0) === 0 && cmpMoney(c, 0) === 0) {
      throw Object.assign(new Error('Each line needs a debit or credit amount'), { status: 422 })
    }
    debits = addMoney(debits, d)
    credits = addMoney(credits, c)
  }
  if (cmpMoney(debits, credits) !== 0) {
    throw Object.assign(new Error(`Debits (${debits}) must equal credits (${credits})`), { status: 422 })
  }
  if (cmpMoney(debits, 0) === 0) {
    throw Object.assign(new Error('Journal must have non-zero totals'), { status: 422 })
  }
}

export class AccountingService {
  async listJournals(
    organizationId: string,
    filters: { status?: string; fiscalYear?: string; entryType?: string; page?: number; limit?: number }
  ) {
    const page = filters.page ?? 1
    const limit = Math.min(filters.limit ?? 50, 100)
    const q = JournalEntry.query().where('organizationId', organizationId).orderBy('createdAt', 'desc')
    if (filters.status) q.where('status', filters.status)
    if (filters.fiscalYear) q.where('fiscalYear', filters.fiscalYear)
    if (filters.entryType) q.where('entryType', filters.entryType)
    return q.paginate(page, limit)
  }

  async getJournal(organizationId: string, id: string) {
    const entry = await JournalEntry.query()
      .where('organizationId', organizationId)
      .where('id', id)
      .preload('lines', (q) => q.orderBy('lineNo', 'asc'))
      .first()
    if (!entry) throw Object.assign(new Error('Journal entry not found'), { status: 404 })
    return entry
  }

  async createJournal(actor: Actor, payload: Record<string, unknown>) {
    const entryType = String(payload.entryType ?? 'journal')
    if (!ENTRY_TYPES.has(entryType)) {
      throw Object.assign(new Error('Invalid entryType'), { status: 422 })
    }
    const linesInput = (payload.lines as Array<Record<string, unknown>> | undefined) ?? []
    if (linesInput.length < 2) {
      throw Object.assign(new Error('At least two journal lines are required'), { status: 422 })
    }

    const normalized = []
    for (const line of linesInput) {
      const fund = await Fund.query()
        .where('id', String(line.fundId))
        .where('organizationId', actor.organizationId)
        .first()
      if (!fund) throw Object.assign(new Error('Fund not found in organization'), { status: 422 })
      const account = await ChartOfAccount.query()
        .where('id', String(line.accountId))
        .where('organizationId', actor.organizationId)
        .first()
      if (!account) throw Object.assign(new Error('Account not found in organization'), { status: 422 })
      if (line.budgetLineId) {
        const bl = await BudgetLine.query()
          .where('id', String(line.budgetLineId))
          .where('organizationId', actor.organizationId)
          .first()
        if (!bl) throw Object.assign(new Error('Budget line not found'), { status: 422 })
      }
      normalized.push({
        fundId: String(line.fundId),
        accountId: String(line.accountId),
        budgetLineId: (line.budgetLineId as string | null | undefined) ?? null,
        debitAmount: moneyOrZero(line.debitAmount),
        creditAmount: moneyOrZero(line.creditAmount),
        subsidiaryEntityType: (line.subsidiaryEntityType as string | null | undefined) ?? null,
        subsidiaryEntityRef: (line.subsidiaryEntityRef as string | null | undefined) ?? null,
        particulars: (line.particulars as string | null | undefined) ?? null,
      })
    }
    validateBalanced(normalized)

    const entryDate = toDateTime(payload.entryDate)
    const fiscalPeriodId = (payload.fiscalPeriodId as string | null | undefined) ?? null
    await assertOpenPeriod(actor.organizationId, fiscalPeriodId, entryDate)

    const entryNumber =
      String(payload.entryNumber ?? '').trim() ||
      `JE-${entryDate.toFormat('yyyyLLdd')}-${Date.now().toString(36).toUpperCase()}`

    const created = await db.transaction(async (trx) => {
      const header = await JournalEntry.create(
        {
          organizationId: actor.organizationId,
          entryNumber,
          entryType,
          fiscalYear: String(payload.fiscalYear),
          fiscalPeriodId,
          entryDate,
          description: String(payload.description),
          status: 'draft',
          sourceModule: (payload.sourceModule as string | null | undefined) ?? null,
          sourceRef: (payload.sourceRef as string | null | undefined) ?? null,
          createdBy: actor.id,
          updatedBy: actor.id,
        },
        { client: trx }
      )

      let lineNo = 1
      for (const line of normalized) {
        await JournalEntryLine.create(
          {
            organizationId: actor.organizationId,
            journalEntryId: header.id,
            lineNo: lineNo++,
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
      action: 'create',
      entityType: 'journal_entries',
      entityId: created.id,
      metadata: { after: created.serialize(), tor: 'FIN-006' },
    })
    return created
  }

  async transitionJournal(actor: Actor, id: string, to: 'submitted' | 'posted' | 'draft') {
    const entry = await this.getJournal(actor.organizationId, id)
    const before = entry.serialize()

    if (to === 'submitted') {
      if (entry.status !== 'draft') {
        throw Object.assign(new Error('Only draft journals can be submitted'), { status: 422 })
      }
      validateBalanced(entry.lines)
      entry.status = 'submitted'
      entry.submittedAt = DateTime.utc()
      entry.submittedBy = actor.id
      entry.updatedBy = actor.id
      await entry.save()
    } else if (to === 'posted') {
      if (entry.status !== 'submitted' && entry.status !== 'draft') {
        throw Object.assign(new Error('Only draft/submitted journals can be posted'), { status: 422 })
      }
      if (entry.status === 'posted') {
        throw Object.assign(new Error('Journal already posted'), { status: 422 })
      }
      validateBalanced(entry.lines)
      await assertOpenPeriod(actor.organizationId, entry.fiscalPeriodId, entry.entryDate)

      const existing = await GeneralLedgerEntry.query()
        .where('organizationId', actor.organizationId)
        .where('journalEntryId', entry.id)
        .first()
      if (existing) {
        throw Object.assign(new Error('Journal already has ledger rows'), { status: 422 })
      }

      await db.transaction(async (trx) => {
        const now = DateTime.utc()
        for (const line of entry.lines) {
          await GeneralLedgerEntry.create(
            {
              organizationId: actor.organizationId,
              journalEntryId: entry.id,
              journalEntryLineId: line.id,
              fiscalYear: entry.fiscalYear,
              fiscalPeriodId: entry.fiscalPeriodId,
              entryDate: entry.entryDate,
              fundId: line.fundId,
              accountId: line.accountId,
              budgetLineId: line.budgetLineId,
              debitAmount: line.debitAmount,
              creditAmount: line.creditAmount,
              subsidiaryEntityType: line.subsidiaryEntityType,
              subsidiaryEntityRef: line.subsidiaryEntityRef,
              entryNumber: entry.entryNumber,
              particulars: line.particulars,
              postedAt: now,
              postedBy: actor.id,
            },
            { client: trx }
          )
        }
        entry.useTransaction(trx)
        entry.status = 'posted'
        entry.postedAt = now
        entry.postedBy = actor.id
        if (!entry.submittedAt) {
          entry.submittedAt = now
          entry.submittedBy = actor.id
        }
        entry.updatedBy = actor.id
        await entry.save()
      })
    } else if (to === 'draft') {
      if (entry.status !== 'submitted') {
        throw Object.assign(new Error('Only submitted journals can return to draft'), { status: 422 })
      }
      entry.status = 'draft'
      entry.submittedAt = null
      entry.submittedBy = null
      entry.updatedBy = actor.id
      await entry.save()
    }

    const after = await this.getJournal(actor.organizationId, id)
    await auditLogService.log({
      organizationId: actor.organizationId,
      actorUserId: actor.id,
      action: to,
      entityType: 'journal_entries',
      entityId: id,
      metadata: { before, after: after.serialize(), tor: 'FIN-006' },
    })
    return after
  }

  async listLedger(
    organizationId: string,
    filters: {
      accountId?: string
      fundId?: string
      fiscalYear?: string
      subsidiaryEntityType?: string
      subsidiaryEntityRef?: string
      page?: number
      limit?: number
    }
  ) {
    const page = filters.page ?? 1
    const limit = Math.min(filters.limit ?? 50, 100)
    const q = GeneralLedgerEntry.query()
      .where('organizationId', organizationId)
      .preload('account')
      .preload('fund')
      .orderBy('entryDate', 'desc')
      .orderBy('createdAt', 'desc')
    if (filters.accountId) q.where('accountId', filters.accountId)
    if (filters.fundId) q.where('fundId', filters.fundId)
    if (filters.fiscalYear) q.where('fiscalYear', filters.fiscalYear)
    if (filters.subsidiaryEntityType) q.where('subsidiaryEntityType', filters.subsidiaryEntityType)
    if (filters.subsidiaryEntityRef) q.where('subsidiaryEntityRef', filters.subsidiaryEntityRef)
    return q.paginate(page, limit)
  }

  async trialBalance(organizationId: string, fiscalYear: string, fundId?: string) {
    let q = GeneralLedgerEntry.query().where('organizationId', organizationId).where('fiscalYear', fiscalYear)
    if (fundId) q = q.where('fundId', fundId)
    const rows = await q.preload('account').preload('fund')

    const map = new Map<
      string,
      {
        accountId: string
        accountCode: string | null
        accountTitle: string | null
        fundId: string
        fundCode: string | null
        debitTotal: string
        creditTotal: string
      }
    >()

    for (const row of rows) {
      const key = `${row.fundId}:${row.accountId}`
      const current = map.get(key) ?? {
        accountId: row.accountId,
        accountCode: row.account?.accountCode ?? null,
        accountTitle: row.account?.accountTitle ?? null,
        fundId: row.fundId,
        fundCode: row.fund?.fundCode ?? null,
        debitTotal: '0.00',
        creditTotal: '0.00',
      }
      current.debitTotal = addMoney(current.debitTotal, row.debitAmount)
      current.creditTotal = addMoney(current.creditTotal, row.creditAmount)
      map.set(key, current)
    }

    const lines = [...map.values()].map((line) => ({
      ...line,
      balance: fromCents(toCents(line.debitTotal) - toCents(line.creditTotal)),
    }))

    const totals = lines.reduce(
      (acc, line) => ({
        debitTotal: addMoney(acc.debitTotal, line.debitTotal),
        creditTotal: addMoney(acc.creditTotal, line.creditTotal),
      }),
      { debitTotal: '0.00', creditTotal: '0.00' }
    )

    return {
      fiscalYear,
      fundId: fundId ?? null,
      lines,
      totals,
      balanced: cmpMoney(totals.debitTotal, totals.creditTotal) === 0,
      calculation: 'Sums of posted general_ledger_entries debit/credit by fund+account for fiscal year',
      tor: ['FIN-006', 'FIN-023'],
    }
  }

  async cashFlowMonitor(organizationId: string, fiscalYear: string) {
    const rows = await GeneralLedgerEntry.query()
      .where('organizationId', organizationId)
      .where('fiscalYear', fiscalYear)
      .preload('account')

    let inflow = '0.00'
    let outflow = '0.00'
    for (const row of rows) {
      const type = (row.account?.accountType || '').toLowerCase()
      if (!type.includes('cash') && !type.includes('bank')) continue
      inflow = addMoney(inflow, row.debitAmount)
      outflow = addMoney(outflow, row.creditAmount)
    }

    return {
      fiscalYear,
      cashDebits: inflow,
      cashCredits: outflow,
      net: fromCents(toCents(inflow) - toCents(outflow)),
      note: 'Includes GL rows whose account_type contains cash or bank (configurable COA types). Depth of bank feeds For Clarification (FIN-009).',
      tor: ['FIN-009'],
    }
  }

  async closeFiscalPeriod(actor: Actor, periodId: string) {
    const period = await FiscalPeriod.query()
      .where('organizationId', actor.organizationId)
      .where('id', periodId)
      .first()
    if (!period) throw Object.assign(new Error('Fiscal period not found'), { status: 404 })
    if (period.status === 'closed') {
      throw Object.assign(new Error('Period already closed'), { status: 422 })
    }
    const before = period.serialize()
    period.status = 'closed'
    period.updatedBy = actor.id
    await period.save()
    await auditLogService.log({
      organizationId: actor.organizationId,
      actorUserId: actor.id,
      action: 'close',
      entityType: 'fiscal_periods',
      entityId: period.id,
      metadata: { before, after: period.serialize(), tor: 'FIN-006' },
    })
    return period
  }

  async reopenFiscalPeriod(actor: Actor, periodId: string) {
    const period = await FiscalPeriod.query()
      .where('organizationId', actor.organizationId)
      .where('id', periodId)
      .first()
    if (!period) throw Object.assign(new Error('Fiscal period not found'), { status: 404 })
    const before = period.serialize()
    period.status = 'open'
    period.updatedBy = actor.id
    await period.save()
    await auditLogService.log({
      organizationId: actor.organizationId,
      actorUserId: actor.id,
      action: 'reopen',
      entityType: 'fiscal_periods',
      entityId: period.id,
      metadata: {
        before,
        after: period.serialize(),
        tor: 'FIN-006',
        note: 'Reopen policy beyond TOR — flagged For Clarification; gated by accounting.close_period',
      },
    })
    return period
  }

  async listTaxRates(organizationId: string) {
    return TaxWithholdingRate.query()
      .where('organizationId', organizationId)
      .orderBy('rateCode', 'asc')
  }

  async createTaxRate(actor: Actor, payload: Record<string, unknown>) {
    const rate = await TaxWithholdingRate.create({
      organizationId: actor.organizationId,
      rateCode: String(payload.rateCode),
      description: String(payload.description),
      ratePercent: String(payload.ratePercent),
      isActive: payload.isActive !== false,
      createdBy: actor.id,
      updatedBy: actor.id,
    })
    await auditLogService.log({
      organizationId: actor.organizationId,
      actorUserId: actor.id,
      action: 'create',
      entityType: 'tax_withholding_rates',
      entityId: rate.id,
      metadata: { after: rate.serialize(), tor: 'FIN-011' },
    })
    return rate
  }

  async createTaxEntry(actor: Actor, payload: Record<string, unknown>) {
    const rate = await TaxWithholdingRate.query()
      .where('organizationId', actor.organizationId)
      .where('id', String(payload.rateId))
      .where('isActive', true)
      .first()
    if (!rate) throw Object.assign(new Error('Active tax rate not found'), { status: 422 })

    const gross = moneyOrZero(payload.grossAmount)
    const ratePercent = String(rate.ratePercent)
    const taxCents =
      (toCents(gross) * BigInt(Math.round(Number(ratePercent) * 10000))) / 1000000n
    const taxAmount = fromCents(taxCents)

    const entry = await TaxWithholdingEntry.create({
      organizationId: actor.organizationId,
      rateId: rate.id,
      payeeName: String(payload.payeeName),
      payeeRef: (payload.payeeRef as string | null | undefined) ?? null,
      grossAmount: gross,
      ratePercent,
      taxAmount,
      transactionDate: toDateTime(payload.transactionDate),
      remittanceStatus: 'pending',
      createdBy: actor.id,
      updatedBy: actor.id,
    })

    await auditLogService.log({
      organizationId: actor.organizationId,
      actorUserId: actor.id,
      action: 'create',
      entityType: 'tax_withholding_entries',
      entityId: entry.id,
      metadata: {
        after: entry.serialize(),
        calculation: 'tax_amount = round(gross_amount * rate_percent / 100) using integer cents',
        tor: 'FIN-011',
      },
    })
    return entry
  }

  async remittanceReport(organizationId: string, filters: { from?: string; to?: string; status?: string }) {
    const q = TaxWithholdingEntry.query()
      .where('organizationId', organizationId)
      .preload('rate')
      .orderBy('transactionDate', 'asc')
    if (filters.status) q.where('remittanceStatus', filters.status)
    if (filters.from) q.where('transactionDate', '>=', filters.from)
    if (filters.to) q.where('transactionDate', '<=', filters.to)
    const rows = await q
    const totalTax = rows.reduce((acc, row) => addMoney(acc, row.taxAmount), '0.00')
    return {
      rows,
      totalTax,
      calculation: 'Sum of tax_withholding_entries.tax_amount for filter window',
      tor: ['FIN-011'],
      note: 'BIR form variants For Clarification',
    }
  }

  async markRemitted(actor: Actor, ids: string[], remittanceBatch: string) {
    const updated: TaxWithholdingEntry[] = []
    await db.transaction(async (trx) => {
      for (const id of ids) {
        const row = await TaxWithholdingEntry.query({ client: trx })
          .where('organizationId', actor.organizationId)
          .where('id', id)
          .first()
        if (!row) continue
        row.useTransaction(trx)
        row.remittanceStatus = 'remitted'
        row.remittanceBatch = remittanceBatch
        row.updatedBy = actor.id
        await row.save()
        updated.push(row)
      }
    })
    await auditLogService.log({
      organizationId: actor.organizationId,
      actorUserId: actor.id,
      action: 'remit',
      entityType: 'tax_withholding_entries',
      entityId: null,
      metadata: { ids, remittanceBatch, count: updated.length, tor: 'FIN-011' },
    })
    return updated
  }

  async listReconciliations(organizationId: string, page = 1, limit = 50) {
    return BankReconciliation.query()
      .where('organizationId', organizationId)
      .orderBy('statementDate', 'desc')
      .paginate(page, Math.min(limit, 100))
  }

  async createReconciliation(actor: Actor, payload: Record<string, unknown>) {
    const account = await BankAccount.query()
      .where('organizationId', actor.organizationId)
      .where('id', String(payload.bankAccountId))
      .first()
    if (!account) throw Object.assign(new Error('Bank account not found'), { status: 422 })

    const created = await db.transaction(async (trx) => {
      const header = await BankReconciliation.create(
        {
          organizationId: actor.organizationId,
          bankAccountId: account.id,
          statementDate: toDateTime(payload.statementDate),
          statementBalance: moneyOrZero(payload.statementBalance),
          bookBalance: moneyOrZero(payload.bookBalance ?? 0),
          status: 'open',
          notes: (payload.notes as string | null | undefined) ?? null,
          createdBy: actor.id,
          updatedBy: actor.id,
        },
        { client: trx }
      )
      const lines = (payload.lines as Array<Record<string, unknown>> | undefined) ?? []
      for (const line of lines) {
        await BankReconciliationLine.create(
          {
            organizationId: actor.organizationId,
            reconciliationId: header.id,
            lineDate: toDateTime(line.lineDate),
            description: String(line.description),
            amount: moneyOrZero(line.amount),
            side: String(line.side),
            cleared: Boolean(line.cleared),
            glEntryId: (line.glEntryId as string | null | undefined) ?? null,
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
      action: 'create',
      entityType: 'bank_reconciliations',
      entityId: created.id,
      metadata: { after: created.serialize(), tor: 'FIN-009' },
    })
    return created
  }

  async completeReconciliation(actor: Actor, id: string) {
    const row = await BankReconciliation.query()
      .where('organizationId', actor.organizationId)
      .where('id', id)
      .preload('lines')
      .first()
    if (!row) throw Object.assign(new Error('Reconciliation not found'), { status: 404 })
    if (row.status === 'completed') {
      throw Object.assign(new Error('Already completed'), { status: 422 })
    }
    const before = row.serialize()
    row.status = 'completed'
    row.updatedBy = actor.id
    await row.save()
    await auditLogService.log({
      organizationId: actor.organizationId,
      actorUserId: actor.id,
      action: 'complete',
      entityType: 'bank_reconciliations',
      entityId: id,
      metadata: { before, after: row.serialize(), tor: 'FIN-009' },
    })
    return row
  }
}

export const accountingService = new AccountingService()
