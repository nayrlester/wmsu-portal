import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import { t } from '#modules/finance/helpers/db_schema'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'
import PosSale from '#modules/finance/models/pos_sale'

export default class PosSaleLine extends BaseModel {
  static table = t('pos_sale_lines')

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare organizationId: string

  @column()
  declare saleId: string

  @column()
  declare lineNo: number

  @column()
  declare catalogItemId: string | null

  @column()
  declare itemCode: string | null

  @column()
  declare description: string

  @column()
  declare quantity: string

  @column()
  declare unitPrice: string

  @column()
  declare taxPercent: string

  @column()
  declare discountPercent: string

  @column()
  declare lineSubtotal: string

  @column()
  declare lineTax: string

  @column()
  declare lineDiscount: string

  @column()
  declare lineTotal: string

  @column()
  declare uimsItemRef: string | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @belongsTo(() => PosSale, { foreignKey: 'saleId' })
  declare sale: BelongsTo<typeof PosSale>
}
