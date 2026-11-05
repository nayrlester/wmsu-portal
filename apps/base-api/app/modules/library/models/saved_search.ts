import { DateTime } from 'luxon'
import { BaseModel, column } from '@adonisjs/lucid/orm'
import { t } from '#modules/library/helpers/db_schema'

export interface SearchFiltersPayload {
  types?: string[]
  preset?: string
  genre?: string
  categoryId?: string
  memberType?: string
  status?: string
}

export default class SavedSearch extends BaseModel {
  static table = t('saved_searches')

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare tenantId: string

  @column()
  declare userId: string

  @column()
  declare name: string

  @column()
  declare query: string

  @column()
  declare filters: SearchFiltersPayload

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null
}
