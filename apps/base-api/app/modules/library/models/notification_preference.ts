import { DateTime } from 'luxon'
import { BaseModel, column } from '@adonisjs/lucid/orm'
import { t } from '#modules/library/helpers/db_schema'

export default class NotificationPreference extends BaseModel {
  static table = t('notification_preferences')

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare tenantId: string

  @column()
  declare ownerType: string

  @column()
  declare ownerId: string

  @column()
  declare eventType: string

  @column()
  declare emailEnabled: boolean

  @column()
  declare inAppEnabled: boolean

  @column()
  declare smsEnabled: boolean

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null
}
