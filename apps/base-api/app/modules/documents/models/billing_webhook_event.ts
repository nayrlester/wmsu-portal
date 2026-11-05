import { t } from '#modules/documents/helpers/db_schema'
import { BaseModel, column } from '@adonisjs/lucid/orm'
import { DateTime } from 'luxon'

export default class BillingWebhookEvent extends BaseModel {
  static table = t('billing_webhook_events')

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare provider: string

  @column()
  declare eventId: string

  @column()
  declare eventType: string

  @column({
    prepare: (value: unknown) => (value === null || value === undefined ? null : JSON.stringify(value)),
    consume: (value: string | Record<string, unknown> | null) => {
      if (value === null || value === undefined) return null
      if (typeof value === 'object') return value as Record<string, unknown>
      return JSON.parse(value) as Record<string, unknown>
    },
  })
  declare payload: Record<string, unknown> | null

  @column.dateTime()
  declare processedAt: DateTime | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime
}
