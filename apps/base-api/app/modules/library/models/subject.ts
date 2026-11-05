import { t } from '#modules/library/helpers/db_schema'
import { DateTime } from 'luxon'
import { BaseModel, column, manyToMany } from '@adonisjs/lucid/orm'
import type { ManyToMany } from '@adonisjs/lucid/types/relations'
import Book from '#modules/library/models/book'

export default class Subject extends BaseModel {
  static table = t('subjects')

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare tenantId: string

  @column()
  declare name: string

  @column()
  declare normalizedName: string

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null

  @manyToMany(() => Book, {
    pivotTable: t('book_subjects'),
    pivotForeignKey: 'subject_id',
    pivotRelatedForeignKey: 'book_id',
    pivotColumns: ['sort_order'],
  })
  declare books: ManyToMany<typeof Book>
}
