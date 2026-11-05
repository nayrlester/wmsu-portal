import { t } from '#modules/documents/helpers/db_schema'
import { BaseModel, column } from '@adonisjs/lucid/orm'
import { DateTime } from 'luxon'

export default class AuditLog extends BaseModel {
  static table = t('audit_logs')

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare tenantId: string | null

  @column()
  declare userId: string | null

  @column()
  declare action: string

  @column()
  declare entityType: string

  @column()
  declare entityId: string | null

  @column()
  declare ipAddress: string | null

  @column()
  declare userAgent: string | null

  @column()
  declare oldValues: Record<string, unknown> | null

  @column()
  declare newValues: Record<string, unknown> | null

  @column()
  declare metadata: Record<string, unknown> | null

  @column()
  declare prevHash: string | null

  @column()
  declare entryHash: string | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime
}
