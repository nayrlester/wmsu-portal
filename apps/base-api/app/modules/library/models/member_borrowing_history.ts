import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Member from '#modules/library/models/member'
import { t } from '#modules/library/helpers/db_schema'

export default class MemberBorrowingHistory extends BaseModel {
  static table = t('member_borrowing_history')

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare tenantId: string

  @column()
  declare memberId: string

  @column()
  declare bookId: string | null

  @column()
  declare bookTitle: string | null

  @column()
  declare status: string

  @column.dateTime()
  declare borrowedAt: DateTime | null

  @column.dateTime()
  declare dueAt: DateTime | null

  @column.dateTime()
  declare returnedAt: DateTime | null

  @column()
  declare notes: string | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @belongsTo(() => Member)
  declare member: BelongsTo<typeof Member>
}
