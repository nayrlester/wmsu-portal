import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import { t } from '#modules/finance/helpers/db_schema'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'
import ProcurementRfq from '#modules/finance/models/procurement_rfq'
import Supplier from '#modules/finance/models/supplier'

export default class ProcurementQuotation extends BaseModel {
  static table = t('procurement_quotations')

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare organizationId: string

  @column()
  declare rfqId: string

  @column()
  declare supplierId: string

  @column()
  declare quotationRef: string | null

  @column()
  declare amount: string

  @column.dateTime()
  declare submittedAt: DateTime | null

  @column()
  declare notes: string | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null

  @belongsTo(() => ProcurementRfq, { foreignKey: 'rfqId' })
  declare rfq: BelongsTo<typeof ProcurementRfq>

  @belongsTo(() => Supplier)
  declare supplier: BelongsTo<typeof Supplier>
}
