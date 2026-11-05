import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'
import { t } from '#modules/finance/helpers/db_schema'
import Organization from '#modules/finance/models/organization'
import Fund from '#modules/finance/models/fund'
import ChartOfAccount from '#modules/finance/models/chart_of_account'
import BudgetLine from '#modules/finance/models/budget_line'

export default class BudgetObligation extends BaseModel {
  static table = t('budget_obligations')

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare organizationId: string

  @column()
  declare documentKind: string

  @column()
  declare documentNumber: string

  @column()
  declare fiscalYear: string

  @column()
  declare fundId: string

  @column()
  declare accountId: string

  @column()
  declare budgetLineId: string | null

  @column()
  declare amount: string

  @column()
  declare particulars: string | null

  @column()
  declare status: string

  @column.dateTime()
  declare postedAt: DateTime | null

  @column()
  declare postedBy: string | null

  @column()
  declare createdBy: string | null

  @column()
  declare updatedBy: string | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null

  @belongsTo(() => Organization)
  declare organization: BelongsTo<typeof Organization>

  @belongsTo(() => Fund)
  declare fund: BelongsTo<typeof Fund>

  @belongsTo(() => ChartOfAccount, { foreignKey: 'accountId' })
  declare account: BelongsTo<typeof ChartOfAccount>

  @belongsTo(() => BudgetLine)
  declare budgetLine: BelongsTo<typeof BudgetLine>
}
