import { t } from '#modules/library/helpers/db_schema'
import { DateTime } from 'luxon'
import { BaseModel, column } from '@adonisjs/lucid/orm'

export default class InventoryCount extends BaseModel {
  static table = t('inventory_counts')

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare tenantId: string

  @column()
  declare shelfCode: string

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime
}
