import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'
import { t } from '#modules/finance/helpers/db_schema'
import TaxWithholdingRate from '#modules/finance/models/tax_withholding_rate'

export default class TaxWithholdingEntry extends BaseModel {
  static table = t('tax_withholding_entries')

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare organizationId: string

  @column()
  declare rateId: string

  @column()
  declare payeeName: string

  @column()
  declare payeeRef: string | null

  @column()
  declare grossAmount: string

  @column()
  declare ratePercent: string

  @column()
  declare taxAmount: string

  @column.date()
  declare transactionDate: DateTime

  @column()
  declare remittanceStatus: string

  @column()
  declare remittanceBatch: string | null

  @column()
  declare journalEntryId: string | null

  @column()
  declare createdBy: string | null

  @column()
  declare updatedBy: string | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null

  @belongsTo(() => TaxWithholdingRate, { foreignKey: 'rateId' })
  declare rate: BelongsTo<typeof TaxWithholdingRate>
}
