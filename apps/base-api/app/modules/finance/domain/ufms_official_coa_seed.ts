import ChartOfAccount from '#modules/finance/models/chart_of_account'
import Fund from '#modules/finance/models/fund'
import OrSeries from '#modules/finance/models/or_series'
import db from '@adonisjs/lucid/services/db'
import { t } from '#modules/finance/helpers/db_schema'

const OFFICIAL_COA: Array<{
  accountCode: string
  accountTitle: string
  accountType: string
  uacsCode?: string
}> = [
  { accountCode: '1010101000', accountTitle: 'Cash - Collecting Officers', accountType: 'asset', uacsCode: '1010101000' },
  { accountCode: '1010102000', accountTitle: 'Cash in Bank - Local Currency', accountType: 'asset', uacsCode: '1010102000' },
  { accountCode: '1010201000', accountTitle: 'Cash in Bank - MDS', accountType: 'asset', uacsCode: '1010201000' },
  { accountCode: '1010401000', accountTitle: 'Accounts Receivable - Students', accountType: 'asset', uacsCode: '1010401000' },
  { accountCode: '1010402000', accountTitle: 'Accounts Receivable - Others', accountType: 'asset', uacsCode: '1010402000' },
  { accountCode: '1040401000', accountTitle: 'Office Supplies Inventory', accountType: 'asset', uacsCode: '1040401000' },
  { accountCode: '1060501000', accountTitle: 'Machinery and Equipment', accountType: 'asset', uacsCode: '1060501000' },
  { accountCode: '1069901000', accountTitle: 'Accumulated Depreciation - Equipment', accountType: 'contra_asset', uacsCode: '1069901000' },
  { accountCode: '2010101000', accountTitle: 'Accounts Payable', accountType: 'liability', uacsCode: '2010101000' },
  { accountCode: '2020101000', accountTitle: 'Due to BIR', accountType: 'liability', uacsCode: '2020101000' },
  { accountCode: '2030101000', accountTitle: 'Trust Liabilities', accountType: 'liability', uacsCode: '2030101000' },
  { accountCode: '3010101000', accountTitle: 'Accumulated Surplus/(Deficit)', accountType: 'equity', uacsCode: '3010101000' },
  { accountCode: '4010101000', accountTitle: 'Tuition Fees', accountType: 'revenue', uacsCode: '4010101000' },
  { accountCode: '4010102000', accountTitle: 'Miscellaneous Fees', accountType: 'revenue', uacsCode: '4010102000' },
  { accountCode: '4020201000', accountTitle: 'Business Income - POS', accountType: 'revenue', uacsCode: '4020201000' },
  { accountCode: '5010101000', accountTitle: 'Salaries and Wages', accountType: 'expense', uacsCode: '5010101000' },
  { accountCode: '5020301000', accountTitle: 'Office Supplies Expenses', accountType: 'expense', uacsCode: '5020301000' },
  { accountCode: '5029901000', accountTitle: 'Other Maintenance and Operating Expenses', accountType: 'expense', uacsCode: '5029901000' },
  { accountCode: '5060101000', accountTitle: 'Depreciation - Machinery and Equipment', accountType: 'expense', uacsCode: '5060101000' },
]

const FUNDS = [
  { fundCode: 'GF', fundName: 'General Fund', fundType: 'general' },
  { fundCode: 'TF', fundName: 'Trust Fund', fundType: 'trust' },
  { fundCode: 'IGP', fundName: 'Income Generating Projects', fundType: 'igp' },
  { fundCode: 'GR', fundName: 'Special Trust / Grants', fundType: 'grant' },
]

export async function seedOfficialUfmsCoa(organizationId: string, actorId?: string | null) {
  const funds = []
  for (const row of FUNDS) {
    funds.push(
      await Fund.updateOrCreate(
        { organizationId, fundCode: row.fundCode },
        { fundName: row.fundName, fundType: row.fundType, isActive: true, openingBalance: '0.00' }
      )
    )
  }
  const fund = funds[0]

  const accounts: ChartOfAccount[] = []
  for (const [index, row] of OFFICIAL_COA.entries()) {
    const account = await ChartOfAccount.updateOrCreate(
      { organizationId, accountCode: row.accountCode },
      {
        accountTitle: row.accountTitle,
        accountType: row.accountType,
        uacsCode: row.uacsCode ?? row.accountCode,
        isPostable: true,
        isActive: true,
        sortOrder: index,
        createdBy: actorId,
        updatedBy: actorId,
      }
    )
    accounts.push(account)
  }

  const orSeries = await OrSeries.updateOrCreate(
    { organizationId, seriesCode: 'TUITION' },
    {
      prefix: 'OR',
      nextNumber: 1,
      padding: 6,
      isActive: true,
      createdBy: actorId,
      updatedBy: actorId,
    }
  )
  await OrSeries.updateOrCreate(
    { organizationId, seriesCode: 'POS' },
    {
      prefix: 'POS',
      nextNumber: 1,
      padding: 6,
      isActive: true,
      createdBy: actorId,
      updatedBy: actorId,
    }
  )
  await OrSeries.updateOrCreate(
    { organizationId, seriesCode: 'MISC' },
    {
      prefix: 'ORM',
      nextNumber: 1,
      padding: 6,
      isActive: true,
      createdBy: actorId,
      updatedBy: actorId,
    }
  )

  const ar = accounts.find((a) => a.accountCode === '1010401000')
  const cash = accounts.find((a) => a.accountCode === '1010102000')
  const revenue = accounts.find((a) => a.accountCode === '4010101000')

  const existing = await db.from(t('ufms_system_settings')).where('organization_id', organizationId).first()
  if (existing) {
    await db
      .from(t('ufms_system_settings'))
      .where('organization_id', organizationId)
      .update({
        tuition_or_series_id: orSeries.id,
        ar_receivable_account_id: ar?.id ?? existing.ar_receivable_account_id,
        ar_cash_account_id: cash?.id ?? existing.ar_cash_account_id,
        ar_revenue_account_id: revenue?.id ?? existing.ar_revenue_account_id,
        default_fund_id: fund.id,
        uims_api_url: existing.uims_api_url ?? 'http://127.0.0.1:3500',
        updated_at: new Date(),
      })
  } else {
    await db.table(t('ufms_system_settings')).insert({
      organization_id: organizationId,
      hard_budget_stop: false,
      tuition_or_series_id: orSeries.id,
      ar_receivable_account_id: ar?.id ?? null,
      ar_cash_account_id: cash?.id ?? null,
      ar_revenue_account_id: revenue?.id ?? null,
      default_fund_id: fund.id,
      uims_api_url: 'http://127.0.0.1:3500',
      created_at: new Date(),
      updated_at: new Date(),
    })
  }

  return {
    seedVersion: 'uacs-2026.1',
    funds: funds.length,
    accounts: accounts.length,
    orSeries: ['TUITION', 'POS', 'MISC'],
  }
}
