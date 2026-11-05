import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Member from '#modules/library/models/member'
import Borrowing from '#modules/library/models/borrowing'
import { t } from '#modules/library/helpers/db_schema'

export type FineStatus = 'pending' | 'partial' | 'paid' | 'waived'
export type FineReason = 'overdue' | 'lost' | 'manual'

export default class Fine extends BaseModel {
  static table = t('fines')

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare tenantId: string

  @column()
  declare memberId: string

  @column()
  declare borrowingId: string | null

  @column()
  declare reason: FineReason | string

  @column()
  declare amountCents: number

  @column()
  declare paidCents: number

  @column()
  declare waivedCents: number

  @column()
  declare status: FineStatus

  @column.dateTime()
  declare assessedAt: DateTime

  @column.dateTime()
  declare dueAt: DateTime | null

  @column.dateTime()
  declare waivedAt: DateTime | null

  @column()
  declare waivedBy: string | null

  @column()
  declare waiveReason: string | null

  @column()
  declare notes: string | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null

  @belongsTo(() => Member)
  declare member: BelongsTo<typeof Member>

  @belongsTo(() => Borrowing)
  declare borrowing: BelongsTo<typeof Borrowing>
}
