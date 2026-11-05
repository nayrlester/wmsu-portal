import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import { t } from '#modules/finance/helpers/db_schema'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'
import PurchaseOrder from '#modules/finance/models/purchase_order'

export default class PurchaseOrderLine extends BaseModel {
  static table = t('purchase_order_lines')

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare organizationId: string

  @column()
  declare purchaseOrderId: string

  @column()
  declare lineNo: number

  @column()
  declare description: string

  @column()
  declare quantity: string

  @column()
  declare uom: string | null

  @column()
  declare unitCost: string

  @column()
  declare lineAmount: string

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null

  @belongsTo(() => PurchaseOrder)
  declare purchaseOrder: BelongsTo<typeof PurchaseOrder>
}
