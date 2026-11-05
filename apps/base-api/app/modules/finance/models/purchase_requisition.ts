import { BaseModel, column, hasMany, belongsTo } from '@adonisjs/lucid/orm'
import { t } from '#modules/finance/helpers/db_schema'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'
import PurchaseRequisitionLine from '#modules/finance/models/purchase_requisition_line'
import Fund from '#modules/finance/models/fund'
import ChartOfAccount from '#modules/finance/models/chart_of_account'
import BudgetLine from '#modules/finance/models/budget_line'
import FinancialPlan from '#modules/finance/models/financial_plan'

export default class PurchaseRequisition extends BaseModel {
  static table = t('purchase_requisitions')

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare organizationId: string

  @column()
  declare prNumber: string

  @column()
  declare requestingOfficeId: string | null

  @column()
  declare purpose: string | null

  @column()
  declare estimatedAmount: string | null

  @column()
  declare status: string

  @column()
  declare fiscalYear: string | null

  @column()
  declare fundId: string | null

  @column()
  declare accountId: string | null

  @column()
  declare budgetLineId: string | null

  @column()
  declare financialPlanId: string | null

  @column()
  declare budgetCheckSufficient: boolean | null

  @column()
  declare budgetCheckAvailable: string | null

  @column.dateTime()
  declare budgetCheckedAt: DateTime | null

  @column()
  declare rejectionReason: string | null

  @column.dateTime()
  declare rejectedAt: DateTime | null

  @column.dateTime()
  declare submittedAt: DateTime | null

  @column.dateTime()
  declare approvedAt: DateTime | null

  @column()
  declare createdBy: string | null

  @column()
  declare updatedBy: string | null

  @column()
  declare submittedBy: string | null

  @column()
  declare approvedBy: string | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null

  @hasMany(() => PurchaseRequisitionLine)
  declare lines: HasMany<typeof PurchaseRequisitionLine>

  @belongsTo(() => Fund)
  declare fund: BelongsTo<typeof Fund>

  @belongsTo(() => ChartOfAccount, { foreignKey: 'accountId' })
  declare account: BelongsTo<typeof ChartOfAccount>

  @belongsTo(() => BudgetLine)
  declare budgetLine: BelongsTo<typeof BudgetLine>

  @belongsTo(() => FinancialPlan)
  declare financialPlan: BelongsTo<typeof FinancialPlan>
}
