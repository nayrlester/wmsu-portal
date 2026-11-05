import { t } from '#modules/documents/helpers/db_schema'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'
import Subscription from '#modules/documents/models/subscription'

export default class Invoice extends BaseModel {
  static table = t('invoices')

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare tenantId: string

  @column()
  declare subscriptionId: string | null

  @column()
  declare invoiceNumber: string

  @column()
  declare amount: number

  @column()
  declare taxAmount: number

  @column()
  declare currency: string

  @column()
  declare status: string

  @column()
  declare provider: string | null

  @column()
  declare providerInvoiceId: string | null

  @column()
  declare couponId: string | null

  @column.dateTime()
  declare dueDate: DateTime | null

  @column.dateTime()
  declare paidAt: DateTime | null

  @column()
  declare pdfUrl: string | null

  @column({
    prepare: (value: unknown) => (value === null || value === undefined ? null : JSON.stringify(value)),
    consume: (value: string | Array<{ description: string; amount: number; quantity: number }> | null) => {
      if (value === null || value === undefined) return null
      if (Array.isArray(value)) return value
      return JSON.parse(value) as Array<{ description: string; amount: number; quantity: number }>
    },
  })
  declare lineItems: Array<{ description: string; amount: number; quantity: number }> | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null

  @belongsTo(() => Subscription)
  declare subscription: BelongsTo<typeof Subscription>
}
