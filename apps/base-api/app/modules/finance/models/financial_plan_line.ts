import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'
import { t } from '#modules/finance/helpers/db_schema'
import Organization from '#modules/finance/models/organization'
import FinancialPlan from '#modules/finance/models/financial_plan'
import Fund from '#modules/finance/models/fund'
import ChartOfAccount from '#modules/finance/models/chart_of_account'

export default class FinancialPlanLine extends BaseModel {
  static table = t('financial_plan_lines')

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare organizationId: string

  @column()
  declare planId: string

  @column()
  declare lineNo: number

  @column()
  declare description: string

  @column()
  declare fundId: string | null

  @column()
  declare accountId: string | null

  @column()
  declare amount: string

  @column()
  declare remarks: string | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null

  @belongsTo(() => Organization)
  declare organization: BelongsTo<typeof Organization>

  @belongsTo(() => FinancialPlan, { foreignKey: 'planId' })
  declare plan: BelongsTo<typeof FinancialPlan>

  @belongsTo(() => Fund)
  declare fund: BelongsTo<typeof Fund>

  @belongsTo(() => ChartOfAccount, { foreignKey: 'accountId' })
  declare account: BelongsTo<typeof ChartOfAccount>
}
