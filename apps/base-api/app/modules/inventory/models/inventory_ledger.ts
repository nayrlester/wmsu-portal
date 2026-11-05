import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import { t } from '#modules/inventory/helpers/db_schema'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'
import Organization from '#modules/inventory/models/organization'
import InventoryTransaction from '#modules/inventory/models/inventory_transaction'
import Item from '#modules/inventory/models/item'
import Warehouse from '#modules/inventory/models/warehouse'
import WarehouseBin from '#modules/inventory/models/warehouse_bin'

export default class InventoryLedger extends BaseModel {
  static table = t('inventory_ledger')

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare organizationId: string

  @column()
  declare transactionId: string

  @column()
  declare itemId: string

  @column()
  declare warehouseId: string

  @column()
  declare binId: string | null

  @column({ consume: (v) => Number(v) })
  declare qtyIn: number

  @column({ consume: (v) => Number(v) })
  declare qtyOut: number

  @column({ consume: (v) => Number(v) })
  declare balanceAfter: number

  @column({ consume: (v) => (v == null ? null : Number(v)) })
  declare unitCost: number | null

  @column.dateTime()
  declare occurredAt: DateTime

  @belongsTo(() => Organization)
  declare organization: BelongsTo<typeof Organization>

  @belongsTo(() => InventoryTransaction, { foreignKey: 'transactionId' })
  declare transaction: BelongsTo<typeof InventoryTransaction>

  @belongsTo(() => Item)
  declare item: BelongsTo<typeof Item>

  @belongsTo(() => Warehouse)
  declare warehouse: BelongsTo<typeof Warehouse>

  @belongsTo(() => WarehouseBin, { foreignKey: 'binId' })
  declare bin: BelongsTo<typeof WarehouseBin>
}
