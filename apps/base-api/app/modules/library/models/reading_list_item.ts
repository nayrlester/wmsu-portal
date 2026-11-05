import { t } from '#modules/library/helpers/db_schema'
import { DateTime } from 'luxon'
import { BaseModel, column } from '@adonisjs/lucid/orm'

export default class ReadingListItem extends BaseModel {
  static table = t('reading_list_items')

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare readingListId: string

  @column()
  declare bookId: string

  @column()
  declare position: number

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime
}
