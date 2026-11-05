import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import { t } from '#modules/inventory/helpers/db_schema'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'
import PhysicalCountSession from '#modules/inventory/models/physical_count_session'
import Item from '#modules/inventory/models/item'
import Asset from '#modules/inventory/models/asset'
import Warehouse from '#modules/inventory/models/warehouse'
import WarehouseBin from '#modules/inventory/models/warehouse_bin'
import User from '#modules/inventory/models/user'

export default class PhysicalCountLine extends BaseModel {
  static table = t('physical_count_lines')

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare sessionId: string

  @column()
  declare itemId: string | null

  @column()
  declare assetId: string | null

  @column()
  declare warehouseId: string | null

  @column()
  declare binId: string | null

  @column({ consume: (v) => Number(v) })
  declare systemQty: number

  @column({ consume: (v) => (v == null ? null : Number(v)) })
  declare countedQty: number | null

  @column({ consume: (v) => (v == null ? null : Number(v)) })
  declare varianceQty: number | null

  @column()
  declare condition: string | null

  @column()
  declare barcodeScanned: string | null

  @column({ consume: (v) => (v == null ? null : Number(v)) })
  declare gpsLat: number | null

  @column({ consume: (v) => (v == null ? null : Number(v)) })
  declare gpsLng: number | null

  @column()
  declare photoUrl: string | null

  @column()
  declare foundUntagged: boolean

  @column()
  declare scannedBy: string | null

  @column.dateTime()
  declare scannedAt: DateTime | null

  @column()
  declare notes: string | null

  @belongsTo(() => PhysicalCountSession, { foreignKey: 'sessionId' })
  declare session: BelongsTo<typeof PhysicalCountSession>

  @belongsTo(() => Item)
  declare item: BelongsTo<typeof Item>

  @belongsTo(() => Asset)
  declare asset: BelongsTo<typeof Asset>

  @belongsTo(() => Warehouse)
  declare warehouse: BelongsTo<typeof Warehouse>

  @belongsTo(() => WarehouseBin, { foreignKey: 'binId' })
  declare bin: BelongsTo<typeof WarehouseBin>

  @belongsTo(() => User, { foreignKey: 'scannedBy' })
  declare scanner: BelongsTo<typeof User>
}
