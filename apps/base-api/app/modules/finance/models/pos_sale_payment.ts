import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import { t } from '#modules/finance/helpers/db_schema'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'
import PosSale from '#modules/finance/models/pos_sale'

export default class PosSalePayment extends BaseModel {
  static table = t('pos_sale_payments')

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare organizationId: string

  @column()
  declare saleId: string

  @column()
  declare lineNo: number

  @column()
  declare paymentMethod: string

  @column()
  declare amount: string

  @column()
  declare paymentReference: string | null

  @column()
  declare status: string

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @belongsTo(() => PosSale, { foreignKey: 'saleId' })
  declare sale: BelongsTo<typeof PosSale>
}
