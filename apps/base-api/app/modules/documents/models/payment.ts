import { t } from '#modules/documents/helpers/db_schema'
import { BaseModel, column } from '@adonisjs/lucid/orm'
import { DateTime } from 'luxon'

export default class Payment extends BaseModel {
  static table = t('payments')

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare tenantId: string

  @column()
  declare subscriptionId: string | null

  @column()
  declare amount: number

  @column()
  declare currency: string

  @column()
  declare status: string

  @column()
  declare provider: string

  @column()
  declare providerPaymentId: string | null

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
  declare paidAt: DateTime | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime
}
