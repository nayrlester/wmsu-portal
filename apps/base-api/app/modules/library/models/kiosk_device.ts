import { t } from '#modules/library/helpers/db_schema'
import { DateTime } from 'luxon'
import { BaseModel, column } from '@adonisjs/lucid/orm'

export default class KioskDevice extends BaseModel {
  static table = t('kiosk_devices')

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare tenantId: string

  @column()
  declare name: string

  @column()
  declare deviceCode: string

  @column()
  declare location: string | null

  @column()
  declare isEnabled: boolean

  @column()
  declare idleTimeoutSeconds: number

  @column()
  declare config: Record<string, unknown> | null

  @column({ serializeAs: null })
  declare apiKeyHash: string | null

  @column()
  declare apiKeyPrefix: string | null

  @column.dateTime()
  declare lastSeenAt: DateTime | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null
}
