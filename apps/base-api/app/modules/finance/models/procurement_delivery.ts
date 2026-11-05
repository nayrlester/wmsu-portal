import { BaseModel, column, hasMany, belongsTo } from '@adonisjs/lucid/orm'
import { t } from '#modules/finance/helpers/db_schema'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'
import PurchaseOrder from '#modules/finance/models/purchase_order'
import ProcurementDeliveryLine from '#modules/finance/models/procurement_delivery_line'

export default class ProcurementDelivery extends BaseModel {
  static table = t('procurement_deliveries')

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare organizationId: string

  @column()
  declare purchaseOrderId: string

  @column()
  declare deliveryNumber: string

  @column.date()
  declare deliveredOn: DateTime

  @column()
  declare status: string

  @column()
  declare notes: string | null

  @column()
  declare receivedBy: string | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null

  @belongsTo(() => PurchaseOrder)
  declare purchaseOrder: BelongsTo<typeof PurchaseOrder>

  @hasMany(() => ProcurementDeliveryLine, { foreignKey: 'deliveryId' })
  declare lines: HasMany<typeof ProcurementDeliveryLine>
}
