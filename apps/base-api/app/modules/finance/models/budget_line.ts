import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'
import { t } from '#modules/finance/helpers/db_schema'
import Organization from '#modules/finance/models/organization'
import Fund from '#modules/finance/models/fund'
import ChartOfAccount from '#modules/finance/models/chart_of_account'

export default class BudgetLine extends BaseModel {
  static table = t('budget_lines')

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare organizationId: string

  @column()
  declare fundId: string

  @column()
  declare accountId: string

  @column()
  declare fiscalYear: string

  @column()
  declare allocatedAmount: string

  @column()
  declare utilizedAmount: string

  @column()
  declare obligatedAmount: string

  @column()
  declare uacsCode: string | null

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
}
