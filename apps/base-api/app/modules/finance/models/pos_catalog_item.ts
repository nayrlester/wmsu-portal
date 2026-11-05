import { BaseModel, column } from '@adonisjs/lucid/orm'
import { t } from '#modules/finance/helpers/db_schema'
import { DateTime } from 'luxon'

export default class PosCatalogItem extends BaseModel {
  static table = t('pos_catalog_items')

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare organizationId: string

  @column()
  declare itemCode: string

  @column()
  declare description: string

  @column()
  declare category: string | null

  @column()
  declare itemKind: string

  @column()
  declare unitPrice: string

  @column()
  declare taxPercent: string

  @column()
  declare discountPercent: string

  @column()
  declare isActive: boolean

  @column()
  declare tracksInventory: boolean

  @column()
  declare uimsItemRef: string | null

  @column()
  declare reorderThreshold: string | null

  @column()
  declare createdBy: string | null

  @column()
  declare updatedBy: string | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null
}
