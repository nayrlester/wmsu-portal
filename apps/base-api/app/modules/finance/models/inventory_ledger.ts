import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import { t } from '#modules/finance/helpers/db_schema'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'
import Organization from '#modules/finance/models/organization'
import InventoryTransaction from '#modules/finance/models/inventory_transaction'
import Item from '#modules/finance/models/item'
import Warehouse from '#modules/finance/models/warehouse'
import WarehouseBin from '#modules/finance/models/warehouse_bin'

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
