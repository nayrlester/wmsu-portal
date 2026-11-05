import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import { t } from '#modules/finance/helpers/db_schema'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'
import Item from '#modules/finance/models/item'
import Warehouse from '#modules/finance/models/warehouse'
import WarehouseBin from '#modules/finance/models/warehouse_bin'

export default class StockBalance extends BaseModel {
  static table = t('stock_balances')

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare itemId: string

  @column()
  declare warehouseId: string

  @column()
  declare binId: string | null

  @column({ consume: (v) => Number(v) })
  declare quantity: number

  @column({ consume: (v) => Number(v) })
  declare reservedQuantity: number

  @column({ consume: (v) => Number(v) })
  declare avgUnitCost: number

  @column()
  declare lotNumber: string | null

  @column()
  declare expiresAt: string | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @belongsTo(() => Item)
  declare item: BelongsTo<typeof Item>

  @belongsTo(() => Warehouse)
  declare warehouse: BelongsTo<typeof Warehouse>

  @belongsTo(() => WarehouseBin, { foreignKey: 'binId' })
  declare bin: BelongsTo<typeof WarehouseBin>

  get availableQuantity(): number {
    return this.quantity - this.reservedQuantity
  }
}
