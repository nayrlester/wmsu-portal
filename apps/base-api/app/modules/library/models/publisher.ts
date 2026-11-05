import { DateTime } from 'luxon'
import { BaseModel, column, hasMany } from '@adonisjs/lucid/orm'
import type { HasMany } from '@adonisjs/lucid/types/relations'
import Book from '#modules/library/models/book'
import { t } from '#modules/library/helpers/db_schema'

export default class Publisher extends BaseModel {
  static table = t('publishers')

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare tenantId: string

  @column()
  declare name: string

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @hasMany(() => Book)
  declare books: HasMany<typeof Book>
}
