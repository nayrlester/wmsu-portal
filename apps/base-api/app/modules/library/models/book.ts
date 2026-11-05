import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo, hasMany, manyToMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany, ManyToMany } from '@adonisjs/lucid/types/relations'
import Publisher from '#modules/library/models/publisher'
import Category from '#modules/library/models/category'
import Author from '#modules/library/models/author'
import Subject from '#modules/library/models/subject'
import BookCopy from '#modules/library/models/book_copy'
import { t } from '#modules/library/helpers/db_schema'

export default class Book extends BaseModel {
  static table = t('books')

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare tenantId: string

  @column({ columnName: 'isbn13' })
  declare isbn13: string | null

  @column({ columnName: 'isbn10' })
  declare isbn10: string | null

  @column()
  declare catalogBarcode: string | null

  @column()
  declare title: string

  @column()
  declare subtitle: string | null

  @column()
  declare genre: string | null

  @column()
  declare materialType: string

  @column()
  declare classificationScheme: string | null

  @column()
  declare classificationNumber: string | null

  @column()
  declare issn: string | null

  @column()
  declare publicationYear: number | null

  @column()
  declare subjectNames: string | null

  @column()
  declare publisherId: string | null

  @column()
  declare categoryId: string | null

  @column()
  declare description: string | null

  @column()
  declare isDigital: boolean

  @column()
  declare coverImageUrl: string | null

  @column()
  declare authorNames: string | null

  @column()
  declare searchText: string | null

  @column()
  declare marcControlNumber: string | null

  @column()
  declare marcFields: Record<string, unknown> | null

  @column()
  declare dublinCore: Record<string, unknown> | null

  @column()
  declare metadataVersion: number

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null

  @column.dateTime()
  declare deletedAt: DateTime | null

  @belongsTo(() => Publisher)
  declare publisher: BelongsTo<typeof Publisher>

  @belongsTo(() => Category)
  declare category: BelongsTo<typeof Category>

  @manyToMany(() => Author, {
    pivotTable: t('book_authors'),
    pivotForeignKey: 'book_id',
    pivotRelatedForeignKey: 'author_id',
    pivotColumns: ['sort_order'],
  })
  declare authors: ManyToMany<typeof Author>

  @manyToMany(() => Subject, {
    pivotTable: t('book_subjects'),
    pivotForeignKey: 'book_id',
    pivotRelatedForeignKey: 'subject_id',
    pivotColumns: ['sort_order'],
  })
  declare subjects: ManyToMany<typeof Subject>

  @hasMany(() => BookCopy)
  declare copies: HasMany<typeof BookCopy>
}
