import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import { t } from '#modules/finance/helpers/db_schema'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Item from '#modules/finance/models/item'
import SupplyRequisition from '#modules/finance/models/supply_requisition'

export default class SupplyRequisitionLine extends BaseModel {
  static table = t('supply_requisition_lines')

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare requisitionId: string

  @column()
  declare itemId: string

  @column({ consume: (v) => Number(v) })
  declare quantityRequested: number

  @column({ consume: (v) => (v == null ? null : Number(v)) })
  declare quantityApproved: number | null

  @column({ consume: (v) => Number(v) })
  declare quantityIssued: number

  @column()
  declare notes: string | null

  @belongsTo(() => SupplyRequisition, { foreignKey: 'requisitionId' })
  declare requisition: BelongsTo<typeof SupplyRequisition>

  @belongsTo(() => Item)
  declare item: BelongsTo<typeof Item>
}
