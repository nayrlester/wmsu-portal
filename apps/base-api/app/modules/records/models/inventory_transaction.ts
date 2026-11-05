import { BaseModel, column, belongsTo, hasMany } from '@adonisjs/lucid/orm'
import { t } from '#modules/records/helpers/db_schema'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'
import Organization from '#modules/records/models/organization'
import Item from '#modules/records/models/item'
import Warehouse from '#modules/records/models/warehouse'
import User from '#modules/records/models/user'
import InventoryLedger from '#modules/records/models/inventory_ledger'

export default class InventoryTransaction extends BaseModel {
  static table = t('inventory_transactions')

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare organizationId: string

  @column()
  declare type: string

  @column()
  declare itemId: string

  @column()
  declare fromWarehouseId: string | null

  @column()
  declare toWarehouseId: string | null

  @column({ consume: (v) => Number(v) })
  declare quantity: number

  @column({ consume: (v) => (v == null ? null : Number(v)) })
  declare unitCost: number | null

  @column()
  declare reference: string | null

  @column()
  declare notes: string | null

  @column()
  declare createdBy: string | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @belongsTo(() => Organization)
  declare organization: BelongsTo<typeof Organization>

  @belongsTo(() => Item)
  declare item: BelongsTo<typeof Item>

  @belongsTo(() => Warehouse, { foreignKey: 'fromWarehouseId' })
  declare fromWarehouse: BelongsTo<typeof Warehouse>

  @belongsTo(() => Warehouse, { foreignKey: 'toWarehouseId' })
  declare toWarehouse: BelongsTo<typeof Warehouse>

  @belongsTo(() => User, { foreignKey: 'createdBy' })
  declare creator: BelongsTo<typeof User>

  @hasMany(() => InventoryLedger, { foreignKey: 'transactionId' })
  declare ledgerEntries: HasMany<typeof InventoryLedger>
}
