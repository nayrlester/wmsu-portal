import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import { t } from '#modules/records/helpers/db_schema'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'
import Warehouse from '#modules/records/models/warehouse'

export default class WarehouseBin extends BaseModel {
  static table = t('warehouse_bins')

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare warehouseId: string

  @column()
  declare zone: string | null

  @column()
  declare rack: string | null

  @column()
  declare shelf: string | null

  @column()
  declare binCode: string

  @column({ consume: (v) => (v == null ? null : Number(v)) })
  declare capacity: number | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @belongsTo(() => Warehouse)
  declare warehouse: BelongsTo<typeof Warehouse>
}
