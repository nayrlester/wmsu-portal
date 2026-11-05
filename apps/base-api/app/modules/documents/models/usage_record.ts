import { t } from '#modules/documents/helpers/db_schema'
import { BaseModel, column } from '@adonisjs/lucid/orm'
import { DateTime } from 'luxon'

export default class UsageRecord extends BaseModel {
  static table = t('usage_records')

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare tenantId: string

  @column()
  declare metric: string

  @column()
  declare quantity: number

  @column.dateTime()
  declare periodStart: DateTime

  @column.dateTime()
  declare periodEnd: DateTime

  @column({
    prepare: (value: unknown) => (value === null || value === undefined ? null : JSON.stringify(value)),
    consume: (value: string | Record<string, unknown> | null) => {
      if (value === null || value === undefined) return null
      if (typeof value === 'object') return value as Record<string, unknown>
      return JSON.parse(value) as Record<string, unknown>
    },
  })
  declare metadata: Record<string, unknown> | null

  @column.dateTime()
  declare recordedAt: DateTime

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime
}
