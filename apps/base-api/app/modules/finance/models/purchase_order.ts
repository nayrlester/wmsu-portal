import { BaseModel, column, hasMany, belongsTo } from '@adonisjs/lucid/orm'
import { t } from '#modules/finance/helpers/db_schema'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'
import PurchaseOrderLine from '#modules/finance/models/purchase_order_line'
import PurchaseRequisition from '#modules/finance/models/purchase_requisition'
import Supplier from '#modules/finance/models/supplier'
import ProcurementAward from '#modules/finance/models/procurement_award'

export default class PurchaseOrder extends BaseModel {
  static table = t('purchase_orders')

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare organizationId: string

  @column()
  declare poNumber: string

  @column()
  declare prId: string | null

  @column()
  declare supplierName: string | null

  @column()
  declare supplierId: string | null

  @column()
  declare awardId: string | null

  @column()
  declare totalAmount: string

  @column()
  declare terms: string | null

  @column()
  declare status: string

  @column()
  declare philgepsReference: string | null

  @column()
  declare contractNumber: string | null

  @column()
  declare fiscalYear: string | null

  @column.dateTime()
  declare issuedAt: DateTime | null

  @column.dateTime()
  declare approvedAt: DateTime | null

  @column()
  declare approvedBy: string | null

  @column()
  declare createdBy: string | null

  @column()
  declare updatedBy: string | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null

  @hasMany(() => PurchaseOrderLine)
  declare lines: HasMany<typeof PurchaseOrderLine>

  @belongsTo(() => PurchaseRequisition, { foreignKey: 'prId' })
  declare purchaseRequisition: BelongsTo<typeof PurchaseRequisition>

  @belongsTo(() => Supplier)
  declare supplier: BelongsTo<typeof Supplier>

  @belongsTo(() => ProcurementAward, { foreignKey: 'awardId' })
  declare award: BelongsTo<typeof ProcurementAward>
}
