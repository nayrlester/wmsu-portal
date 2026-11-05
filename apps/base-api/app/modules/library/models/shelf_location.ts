import { t } from '#modules/library/helpers/db_schema'
import { DateTime } from 'luxon'
import { BaseModel, column } from '@adonisjs/lucid/orm'

export default class ShelfLocation extends BaseModel {
  static table = t('shelf_locations')

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare tenantId: string

  @column()
  declare code: string

  @column()
  declare label: string

  @column()
  declare floor: string | null

  @column()
  declare aisle: string | null

  @column()
  declare shelf: string | null

  @column()
  declare mapCoordinates: Record<string, unknown> | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null
}
