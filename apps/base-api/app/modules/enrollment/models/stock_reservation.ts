import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import { t } from '#modules/enrollment/helpers/db_schema'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'
import Organization from '#modules/enrollment/models/organization'
import Item from '#modules/enrollment/models/item'
import Warehouse from '#modules/enrollment/models/warehouse'
import User from '#modules/enrollment/models/user'

export default class StockReservation extends BaseModel {
  static table = t('stock_reservations')

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare organizationId: string

  @column()
  declare itemId: string

  @column()
  declare warehouseId: string

  @column({ consume: (v) => Number(v) })
  declare quantity: number

  @column()
  declare status: string

  @column()
  declare reference: string | null

  @column()
  declare requisitionId: string | null

  @column()
  declare createdBy: string | null

  @column.dateTime()
  declare expiresAt: DateTime | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null

  @belongsTo(() => Organization)
  declare organization: BelongsTo<typeof Organization>

  @belongsTo(() => Item)
  declare item: BelongsTo<typeof Item>

  @belongsTo(() => Warehouse)
  declare warehouse: BelongsTo<typeof Warehouse>

  @belongsTo(() => User, { foreignKey: 'createdBy' })
  declare creator: BelongsTo<typeof User>
}
