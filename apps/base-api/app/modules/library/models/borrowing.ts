import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Member from '#modules/library/models/member'
import Book from '#modules/library/models/book'
import BookCopy from '#modules/library/models/book_copy'
import { t } from '#modules/library/helpers/db_schema'

export type BorrowingStatus =
  | 'requested'
  | 'approved'
  | 'borrowed'
  | 'returned'
  | 'overdue'
  | 'lost'

export default class Borrowing extends BaseModel {
  static table = t('borrowings')

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare tenantId: string

  @column()
  declare transactionNumber: string

  @column()
  declare memberId: string

  @column()
  declare bookId: string

  @column()
  declare copyId: string | null

  @column()
  declare status: BorrowingStatus

  @column.dateTime()
  declare requestedAt: DateTime

  @column.dateTime()
  declare approvedAt: DateTime | null

  @column()
  declare approvedBy: string | null

  @column.dateTime()
  declare borrowedAt: DateTime | null

  @column.dateTime()
  declare dueAt: DateTime | null

  @column.dateTime()
  declare returnedAt: DateTime | null

  @column()
  declare checkedOutBy: string | null

  @column()
  declare returnedBy: string | null

  @column.dateTime()
  declare lostAt: DateTime | null

  @column()
  declare lostReportedBy: string | null

  @column()
  declare notes: string | null

  @column()
  declare renewalCount: number

  @column()
  declare maxRenewals: number

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null

  @belongsTo(() => Member)
  declare member: BelongsTo<typeof Member>

  @belongsTo(() => Book)
  declare book: BelongsTo<typeof Book>

  @belongsTo(() => BookCopy, {
    foreignKey: 'copyId',
  })
  declare copy: BelongsTo<typeof BookCopy>
}
