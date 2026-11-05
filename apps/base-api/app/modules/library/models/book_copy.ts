import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Book from '#modules/library/models/book'
import { t } from '#modules/library/helpers/db_schema'

export type BookCopyStatus =
  | 'available'
  | 'on_loan'
  | 'reserved'
  | 'maintenance'
  | 'lost'
  | 'withdrawn'

export default class BookCopy extends BaseModel {
  static table = t('book_copies')

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare tenantId: string

  @column()
  declare bookId: string

  @column()
  declare barcode: string

  @column()
  declare copyNumber: number

  @column()
  declare status: BookCopyStatus

  @column()
  declare shelfLocation: string | null

  @column()
  declare condition: string | null

  @column()
  declare notes: string | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null

  @column.dateTime()
  declare deletedAt: DateTime | null

  @belongsTo(() => Book)
  declare book: BelongsTo<typeof Book>
}
