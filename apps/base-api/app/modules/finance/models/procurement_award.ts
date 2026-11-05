import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import { t } from '#modules/finance/helpers/db_schema'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'
import ProcurementRfq from '#modules/finance/models/procurement_rfq'
import ProcurementAbstract from '#modules/finance/models/procurement_abstract'
import ProcurementQuotation from '#modules/finance/models/procurement_quotation'
import Supplier from '#modules/finance/models/supplier'

export default class ProcurementAward extends BaseModel {
  static table = t('procurement_awards')

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare organizationId: string

  @column()
  declare rfqId: string

  @column()
  declare abstractId: string | null

  @column()
  declare quotationId: string

  @column()
  declare supplierId: string

  @column()
  declare awardedAmount: string

  @column()
  declare philgepsReference: string | null

  @column()
  declare status: string

  @column.dateTime()
  declare awardedAt: DateTime | null

  @column()
  declare awardedBy: string | null

  @column()
  declare notes: string | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null

  @belongsTo(() => ProcurementRfq, { foreignKey: 'rfqId' })
  declare rfq: BelongsTo<typeof ProcurementRfq>

  @belongsTo(() => ProcurementAbstract, { foreignKey: 'abstractId' })
  declare abstract: BelongsTo<typeof ProcurementAbstract>

  @belongsTo(() => ProcurementQuotation)
  declare quotation: BelongsTo<typeof ProcurementQuotation>

  @belongsTo(() => Supplier)
  declare supplier: BelongsTo<typeof Supplier>
}
