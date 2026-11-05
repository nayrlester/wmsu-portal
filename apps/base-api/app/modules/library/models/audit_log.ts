import { DateTime } from 'luxon'
import { BaseModel, column } from '@adonisjs/lucid/orm'
import { t } from '#modules/library/helpers/db_schema'

export type AuditAction = 'create' | 'update' | 'delete' | 'login' | 'logout' | 'export'

export default class AuditLog extends BaseModel {
  static table = t('audit_logs')

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare tenantId: string | null

  @column()
  declare userId: string | null

  @column()
  declare userEmail: string | null

  @column()
  declare action: AuditAction

  @column()
  declare resourceType: string

  @column()
  declare resourceId: string | null

  @column()
  declare oldValues: Record<string, unknown> | null

  @column()
  declare newValues: Record<string, unknown> | null

  @column()
  declare ipAddress: string | null

  @column()
  declare requestId: string | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime
}
