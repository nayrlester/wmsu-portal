import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import { t } from '#modules/finance/helpers/db_schema'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'
import PurchaseOrder from '#modules/finance/models/purchase_order'
import ProcurementDelivery from '#modules/finance/models/procurement_delivery'

export default class InspectionAcceptanceReport extends BaseModel {
  static table = t('inspection_acceptance_reports')

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare organizationId: string

  @column()
  declare purchaseOrderId: string

  @column()
  declare deliveryId: string

  @column()
  declare iarNumber: string

  @column()
  declare result: string

  @column()
  declare status: string

  @column()
  declare notes: string | null

  @column.dateTime()
  declare inspectedAt: DateTime | null

  @column()
  declare inspectedBy: string | null

  @column()
  declare uimsSyncStatus: string

  @column.dateTime()
  declare uimsSyncedAt: DateTime | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null

  @belongsTo(() => PurchaseOrder)
  declare purchaseOrder: BelongsTo<typeof PurchaseOrder>

  @belongsTo(() => ProcurementDelivery, { foreignKey: 'deliveryId' })
  declare delivery: BelongsTo<typeof ProcurementDelivery>
}
