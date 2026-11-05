import { DateTime } from 'luxon'
import { BaseModel, column, manyToMany } from '@adonisjs/lucid/orm'
import type { ManyToMany } from '@adonisjs/lucid/types/relations'
import Book from '#modules/library/models/book'
import { t } from '#modules/library/helpers/db_schema'

export default class Author extends BaseModel {
  static table = t('authors')

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare tenantId: string

  @column()
  declare fullName: string

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @manyToMany(() => Book, {
    pivotTable: t('book_authors'),
    pivotForeignKey: 'author_id',
    pivotRelatedForeignKey: 'book_id',
    pivotColumns: ['sort_order'],
  })
  declare books: ManyToMany<typeof Book>
}
