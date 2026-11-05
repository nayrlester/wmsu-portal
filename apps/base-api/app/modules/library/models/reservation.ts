import { DateTime } from 'luxon'
import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Book from '#modules/library/models/book'
import Member from '#modules/library/models/member'
import BookCopy from '#modules/library/models/book_copy'
import { t } from '#modules/library/helpers/db_schema'

export type ReservationStatus = 'pending' | 'ready' | 'fulfilled' | 'cancelled' | 'expired'

export default class Reservation extends BaseModel {
  static table = t('reservations')

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare tenantId: string

  @column()
  declare memberId: string

  @column()
  declare bookId: string

  @column()
  declare copyId: string | null

  @column()
  declare status: ReservationStatus

  @column()
  declare queuePosition: number | null

  @column.dateTime()
  declare reservedAt: DateTime

  @column.dateTime()
  declare readyAt: DateTime | null

  @column.dateTime()
  declare expiresAt: DateTime | null

  @column.dateTime()
  declare fulfilledAt: DateTime | null

  @column.dateTime()
  declare cancelledAt: DateTime | null

  @column()
  declare cancelReason: string | null

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
