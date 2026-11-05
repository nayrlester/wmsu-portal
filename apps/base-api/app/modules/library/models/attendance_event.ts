import { t } from '#modules/library/helpers/db_schema'
import { DateTime } from 'luxon'
import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Member from '#modules/library/models/member'

export type AttendanceDirection = 'in' | 'out'
export type AttendanceSource = 'desk' | 'kiosk' | 'import'

export default class AttendanceEvent extends BaseModel {
  static table = t('attendance_events')

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare tenantId: string

  @column()
  declare memberId: string | null

  @column()
  declare cardNumber: string

  @column()
  declare direction: AttendanceDirection | string

  @column()
  declare source: AttendanceSource | string

  @column.dateTime()
  declare occurredAt: DateTime

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @belongsTo(() => Member)
  declare member: BelongsTo<typeof Member>
}
