import { BaseModel, column, belongsTo, hasMany } from '@adonisjs/lucid/orm'
import { t } from '#modules/enrollment/helpers/db_schema'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'
import Organization from '#modules/enrollment/models/organization'
import ItemCategory from '#modules/enrollment/models/item_category'
import StockBalance from '#modules/enrollment/models/stock_balance'
import Supplier from '#modules/enrollment/models/supplier'

export default class Item extends BaseModel {
  static table = t('items')

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare organizationId: string

  @column()
  declare categoryId: string | null

  @column()
  declare sku: string

  @column()
  declare barcode: string | null

  @column()
  declare name: string

  @column()
  declare uom: string

  @column()
  declare fundSource: string | null

  @column()
  declare brand: string | null

  @column()
  declare model: string | null

  @column()
  declare manufacturer: string | null

  @column({ consume: (v) => Number(v) })
  declare minStock: number

  @column({ consume: (v) => (v == null ? null : Number(v)) })
  declare maxStock: number | null

  @column({ consume: (v) => (v == null ? null : Number(v)) })
  declare reorderPoint: number | null

  @column({ consume: (v) => Number(v) })
  declare safetyStock: number

  @column()
  declare expiryTracked: boolean

  @column()
  declare description: string | null

  @column()
  declare supplierId: string | null

  @column()
  declare valuationMethod: string

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @column.dateTime()
  declare deletedAt: DateTime | null

  @belongsTo(() => Organization)
  declare organization: BelongsTo<typeof Organization>

  @belongsTo(() => ItemCategory, { foreignKey: 'categoryId' })
  declare category: BelongsTo<typeof ItemCategory>

  @belongsTo(() => Supplier)
  declare supplier: BelongsTo<typeof Supplier>

  @hasMany(() => StockBalance)
  declare stockBalances: HasMany<typeof StockBalance>
}
