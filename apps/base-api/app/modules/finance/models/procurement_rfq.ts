import { BaseModel, column, hasMany, belongsTo } from '@adonisjs/lucid/orm'
import { t } from '#modules/finance/helpers/db_schema'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'
import PurchaseRequisition from '#modules/finance/models/purchase_requisition'
import ProcurementQuotation from '#modules/finance/models/procurement_quotation'

export default class ProcurementRfq extends BaseModel {
  static table = t('procurement_rfqs')

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare organizationId: string

  @column()
  declare purchaseRequisitionId: string

  @column()
  declare rfqNumber: string

  @column()
  declare method: string

  @column()
  declare status: string

  @column()
  declare philgepsReference: string | null

  @column()
  declare notes: string | null

  @column.dateTime()
  declare issuedAt: DateTime | null

  @column.dateTime()
  declare closedAt: DateTime | null

  @column()
  declare createdBy: string | null

  @column()
  declare updatedBy: string | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null

  @belongsTo(() => PurchaseRequisition)
  declare purchaseRequisition: BelongsTo<typeof PurchaseRequisition>

  @hasMany(() => ProcurementQuotation, { foreignKey: 'rfqId' })
  declare quotations: HasMany<typeof ProcurementQuotation>
}
