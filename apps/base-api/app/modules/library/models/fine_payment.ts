import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Fine from '#modules/library/models/fine'
import { t } from '#modules/library/helpers/db_schema'

export default class FinePayment extends BaseModel {
  static table = t('fine_payments')

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare tenantId: string

  @column()
  declare fineId: string

  @column()
  declare amountCents: number

  @column()
  declare paymentMethod: string

  @column()
  declare reference: string | null

  @column()
  declare receivedBy: string | null

  @column.dateTime()
  declare paidAt: DateTime

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @belongsTo(() => Fine)
  declare fine: BelongsTo<typeof Fine>
}
