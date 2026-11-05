import { BaseModel, column } from '@adonisjs/lucid/orm'
import { t } from '#modules/finance/helpers/db_schema'
import { DateTime } from 'luxon'

export default class PosUimsStockEvent extends BaseModel {
  static table = t('pos_uims_stock_events')

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare organizationId: string

  @column()
  declare saleId: string | null

  @column()
  declare eventType: string

  @column()
  declare uimsItemRef: string | null

  @column()
  declare status: string

  @column({
    prepare: (value: Record<string, unknown> | null) => (value ? JSON.stringify(value) : null),
    consume: (value: string | Record<string, unknown> | null) => {
      if (!value) return null
      return typeof value === 'string' ? JSON.parse(value) : value
    },
  })
  declare payload: Record<string, unknown> | null

  @column()
  declare purchaseRequisitionId: string | null

  @column()
  declare lastError: string | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null
}
