import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import { t } from '#modules/finance/helpers/db_schema'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'
import PurchaseRequisition from '#modules/finance/models/purchase_requisition'

export default class PurchaseRequisitionLine extends BaseModel {
  static table = t('purchase_requisition_lines')

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare organizationId: string

  @column()
  declare purchaseRequisitionId: string

  @column()
  declare lineNo: number

  @column()
  declare description: string

  @column()
  declare quantity: string

  @column()
  declare uom: string | null

  @column()
  declare unitCost: string | null

  @column()
  declare estimatedAmount: string | null

  @column()
  declare itemId: string | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null

  @belongsTo(() => PurchaseRequisition)
  declare purchaseRequisition: BelongsTo<typeof PurchaseRequisition>
}
