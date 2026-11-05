import { BaseModel, column, belongsTo, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'
import { t } from '#modules/finance/helpers/db_schema'
import BankAccount from '#modules/finance/models/bank_account'
import BankReconciliationLine from '#modules/finance/models/bank_reconciliation_line'

export default class BankReconciliation extends BaseModel {
  static table = t('bank_reconciliations')

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare organizationId: string

  @column()
  declare bankAccountId: string

  @column.date()
  declare statementDate: DateTime

  @column()
  declare statementBalance: string

  @column()
  declare bookBalance: string

  @column()
  declare status: string

  @column()
  declare notes: string | null

  @column()
  declare createdBy: string | null

  @column()
  declare updatedBy: string | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null

  @belongsTo(() => BankAccount)
  declare bankAccount: BelongsTo<typeof BankAccount>

  @hasMany(() => BankReconciliationLine, { foreignKey: 'reconciliationId' })
  declare lines: HasMany<typeof BankReconciliationLine>
}
