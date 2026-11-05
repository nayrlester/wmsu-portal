import { DateTime } from 'luxon'
import { BaseModel, column } from '@adonisjs/lucid/orm'
import { t } from '#modules/library/helpers/db_schema'

export default class Notification extends BaseModel {
  static table = t('notifications')

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare tenantId: string

  @column()
  declare eventType: string

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

  @column.dateTime()
  declare readAt: DateTime | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime
}
