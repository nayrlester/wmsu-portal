import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'
import GeneralLedgerEntry from '#modules/finance/models/general_ledger_entry'
import ChartOfAccount from '#modules/finance/models/chart_of_account'
import BudgetLine from '#modules/finance/models/budget_line'
import { t } from '#modules/finance/helpers/db_schema'
import { receivablesService } from '#modules/finance/services/ufms/receivables_service'
import { addMoney, subMoney } from '#modules/finance/helpers/money'

export class FinancialReportingService {
  async trialBalance(organizationId: string, fiscalYear?: string) {
    const year = fiscalYear ?? String(DateTime.now().year)
    const q = GeneralLedgerEntry.query().where('organizationId', organizationId)
    if (year) q.where('fiscalYear', year)
    const rows = await q.preload('account')
    const map = new Map<string, { accountCode: string; accountTitle: string; debit: string; credit: string }>()
    for (const row of rows) {
      const key = row.accountId
      const existing = map.get(key) ?? {
        accountCode: row.account?.accountCode ?? key,
        accountTitle: row.account?.accountTitle ?? '',
        debit: '0.00',
        credit: '0.00',
      }
      existing.debit = addMoney(existing.debit, row.debitAmount)
      existing.credit = addMoney(existing.credit, row.creditAmount)
      map.set(key, existing)
    }
    return { fiscalYear: year, lines: [...map.values()], tor: ['FIN-020', 'FIN-024'] }
  }

  async statementOfFinancialPosition(organizationId: string) {
    const accounts = await ChartOfAccount.query().where('organizationId', organizationId).where('isActive', true)
    const tb = await this.trialBalance(organizationId)
    const byCode = new Map(tb.lines.map((l) => [l.accountCode, l]))
    const assets = accounts
      .filter((a) => a.accountType === 'asset')
      .map((a) => ({ ...a.serialize(), balance: byCode.get(a.accountCode) }))
    const liabilities = accounts
      .filter((a) => a.accountType === 'liability')
      .map((a) => ({ ...a.serialize(), balance: byCode.get(a.accountCode) }))
    const equity = accounts
      .filter((a) => a.accountType === 'equity')
      .map((a) => ({ ...a.serialize(), balance: byCode.get(a.accountCode) }))
    return { asOf: DateTime.now().toISODate(), assets, liabilities, equity, tor: 'FIN-020' }
  }

  async budgetVsActual(organizationId: string, fiscalYear: string) {
    const lines = await BudgetLine.query().where('organizationId', organizationId).where('fiscalYear', fiscalYear)
    return {
      fiscalYear,
      lines: lines.map((l) => ({
        fundId: l.fundId,
        accountId: l.accountId,
        allocated: l.allocatedAmount,
        obligated: l.obligatedAmount,
        utilized: l.utilizedAmount,
        available: subMoney(l.allocatedAmount, addMoney(l.obligatedAmount, l.utilizedAmount)),
      })),
      tor: ['FIN-020', 'FIN-024'],
    }
  }

  async receivablesAging(organizationId: string) {
    const items = await db
      .from(t('student_ar_open_items'))
      .where({ organization_id: organizationId, status: 'open' })
    const buckets = { current: 0, over30: 0, over60: 0, over90: 0 }
    const now = DateTime.now()
    for (const item of items) {
      const days = now.diff(DateTime.fromJSDate(new Date(item.opened_at)), 'days').days
      const amt = Number(item.open_amount)
      if (days <= 30) buckets.current += amt
      else if (days <= 60) buckets.over30 += amt
      else if (days <= 90) buckets.over60 += amt
      else buckets.over90 += amt
    }
    return { buckets, openItems: items.length, tor: 'FIN-024' }
  }

  async saobSummary(organizationId: string, fiscalYear: string) {
    const lines = await BudgetLine.query().where('organizationId', organizationId).where('fiscalYear', fiscalYear)
    return {
      fiscalYear,
      appropriations: lines.reduce((s, l) => addMoney(s, l.allocatedAmount), '0.00'),
      obligations: lines.reduce((s, l) => addMoney(s, l.obligatedAmount), '0.00'),
      balances: lines.reduce(
        (s, l) => addMoney(s, subMoney(l.allocatedAmount, addMoney(l.obligatedAmount, l.utilizedAmount))),
        '0.00'
      ),
      tor: 'FIN-024',
    }
  }

  async dashboardMetrics(organizationId: string) {
    const [collections, aging, saob] = await Promise.all([
      receivablesService.dailyCollectionReport(organizationId),
      this.receivablesAging(organizationId),
      this.saobSummary(organizationId, String(DateTime.now().year)),
    ])
    return {
      collectionsToday: collections.total,
      collectionsCount: collections.count,
      receivablesAging: aging.buckets,
      budget: saob,
      tor: ['FIN-020', 'FIN-032'],
    }
  }

  async auditExport(organizationId: string, from?: string, to?: string) {
    const q = db.from(t('audit_logs')).where('organization_id', organizationId).orderBy('created_at', 'desc').limit(5000)
    if (from) q.where('created_at', '>=', from)
    if (to) q.where('created_at', '<=', to)
    const rows = await q
    return { count: rows.length, rows, exportedAt: DateTime.now().toISO(), tor: 'FIN-025' }
  }
}

export const financialReportingService = new FinancialReportingService()
