import { BaseModel, column } from '@adonisjs/lucid/orm'
import { t } from '#modules/finance/helpers/db_schema'
import { DateTime } from 'luxon'

export default class PosUimsStockSnapshot extends BaseModel {
  static table = t('pos_uims_stock_snapshots')

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare organizationId: string

  @column()
  declare uimsItemRef: string

  @column()
  declare quantityOnHand: string

  @column()
  declare uom: string | null

  @column.dateTime()
  declare sourcedAt: DateTime

  @column()
  declare source: string

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null
}
