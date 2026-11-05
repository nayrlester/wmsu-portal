import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'
import { t } from '#modules/finance/helpers/db_schema'
import BankReconciliation from '#modules/finance/models/bank_reconciliation'

export default class BankReconciliationLine extends BaseModel {
  static table = t('bank_reconciliation_lines')

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare organizationId: string

  @column()
  declare reconciliationId: string

  @column.date()
  declare lineDate: DateTime

  @column()
  declare description: string

  @column()
  declare amount: string

  @column()
  declare side: string

  @column()
  declare cleared: boolean

  @column()
  declare glEntryId: string | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null

  @belongsTo(() => BankReconciliation, { foreignKey: 'reconciliationId' })
  declare reconciliation: BelongsTo<typeof BankReconciliation>
}
