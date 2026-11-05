import { BaseModel, column, hasMany } from '@adonisjs/lucid/orm'
import { t } from '#modules/finance/helpers/db_schema'
import type { HasMany } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'
import PosSaleLine from '#modules/finance/models/pos_sale_line'
import PosSalePayment from '#modules/finance/models/pos_sale_payment'

export default class PosSale extends BaseModel {
  static table = t('pos_sales')

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare organizationId: string

  @column()
  declare terminalId: string | null

  @column()
  declare saleNumber: string

  @column()
  declare receiptNumber: string | null

  @column()
  declare idempotencyKey: string | null

  @column()
  declare status: string

  @column()
  declare subtotalAmount: string

  @column()
  declare taxAmount: string

  @column()
  declare discountAmount: string

  @column()
  declare totalAmount: string

  @column()
  declare amountTendered: string

  @column()
  declare changeAmount: string

  @column()
  declare cashierId: string | null

  @column.dateTime()
  declare completedAt: DateTime | null

  @column.dateTime()
  declare voidedAt: DateTime | null

  @column()
  declare voidedBy: string | null

  @column()
  declare voidReason: string | null

  @column()
  declare journalEntryId: string | null

  @column()
  declare accountingStatus: string

  @column()
  declare accountingError: string | null

  @column()
  declare eodSessionId: string | null

  @column({
    prepare: (value: Record<string, unknown> | null) => (value ? JSON.stringify(value) : null),
    consume: (value: string | Record<string, unknown> | null) => {
      if (!value) return null
      return typeof value === 'string' ? JSON.parse(value) : value
    },
  })
  declare receiptSnapshot: Record<string, unknown> | null

  @column()
  declare createdBy: string | null

  @column()
  declare updatedBy: string | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null

  @hasMany(() => PosSaleLine, { foreignKey: 'saleId' })
  declare lines: HasMany<typeof PosSaleLine>

  @hasMany(() => PosSalePayment, { foreignKey: 'saleId' })
  declare payments: HasMany<typeof PosSalePayment>
}
