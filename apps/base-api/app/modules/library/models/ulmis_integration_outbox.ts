import { t } from '#modules/library/helpers/db_schema'
import { DateTime } from 'luxon'
import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Tenant from '#modules/library/models/tenant'

export type UlmisOutboxStatus = 'pending' | 'processing' | 'sent' | 'failed' | 'cancelled'

export default class UlmisIntegrationOutbox extends BaseModel {
  static table = t('ulmis_integration_outbox')

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare tenantId: string

  @column()
  declare contractCode: string

  @column()
  declare targetSystem: string

  @column()
  declare eventType: string

  @column()
  declare idempotencyKey: string

  @column()
  declare payload: Record<string, unknown>

  @column()
  declare status: UlmisOutboxStatus

  @column()
  declare lastError: string | null

  @column()
  declare attemptCount: number

  @column.dateTime()
  declare processedAt: DateTime | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @belongsTo(() => Tenant)
  declare tenant: BelongsTo<typeof Tenant>
}
