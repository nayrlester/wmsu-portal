import { DateTime } from 'luxon'
import { BaseModel, column } from '@adonisjs/lucid/orm'
import { t } from '#modules/library/helpers/db_schema'

export type NotificationStatus = 'pending' | 'sent' | 'failed'

export default class NotificationLog extends BaseModel {
  static table = t('notification_logs')

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare tenantId: string

  @column()
  declare eventType: string

  @column()
  declare channel: string

  @column()
  declare recipientType: string

  @column()
  declare recipientId: string | null

  @column()
  declare title: string

  @column()
  declare body: string

  @column()
  declare payload: Record<string, unknown>

  @column()
  declare status: NotificationStatus

  @column()
  declare failedReason: string | null

  @column.dateTime()
  declare sentAt: DateTime | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime
}
