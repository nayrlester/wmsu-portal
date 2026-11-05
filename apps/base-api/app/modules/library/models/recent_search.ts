import { DateTime } from 'luxon'
import { BaseModel, column } from '@adonisjs/lucid/orm'
import type { SearchFiltersPayload } from '#modules/library/models/saved_search'
import { t } from '#modules/library/helpers/db_schema'

export default class RecentSearch extends BaseModel {
  static table = t('recent_searches')

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare tenantId: string

  @column()
  declare userId: string

  @column()
  declare query: string

  @column()
  declare filters: SearchFiltersPayload

  @column.dateTime()
  declare searchedAt: DateTime

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime
}
