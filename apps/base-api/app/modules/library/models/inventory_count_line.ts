import { t } from '#modules/library/helpers/db_schema'
import { DateTime } from 'luxon'
import { BaseModel, column } from '@adonisjs/lucid/orm'

export default class InventoryCountLine extends BaseModel {
  static table = t('inventory_count_lines')

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare tenantId: string

  @column()
  declare countId: string

  @column()
  declare scannedValue: string

  @column()
  declare copyId: string | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime
}
