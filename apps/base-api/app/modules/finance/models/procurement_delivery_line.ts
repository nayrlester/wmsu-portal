import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import { t } from '#modules/finance/helpers/db_schema'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'
import ProcurementDelivery from '#modules/finance/models/procurement_delivery'
import PurchaseOrderLine from '#modules/finance/models/purchase_order_line'

export default class ProcurementDeliveryLine extends BaseModel {
  static table = t('procurement_delivery_lines')

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare organizationId: string

  @column()
  declare deliveryId: string

  @column()
  declare purchaseOrderLineId: string | null

  @column()
  declare lineNo: number

  @column()
  declare quantityDelivered: string

  @column()
  declare conditionNotes: string | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @belongsTo(() => ProcurementDelivery, { foreignKey: 'deliveryId' })
  declare delivery: BelongsTo<typeof ProcurementDelivery>

  @belongsTo(() => PurchaseOrderLine)
  declare purchaseOrderLine: BelongsTo<typeof PurchaseOrderLine>
}
