import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import { t } from '#modules/finance/helpers/db_schema'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'
import InspectionAcceptanceReport from '#modules/finance/models/inspection_acceptance_report'
import PurchaseOrder from '#modules/finance/models/purchase_order'

export default class ProcurementUimsEvent extends BaseModel {
  static table = t('procurement_uims_events')

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare organizationId: string

  @column()
  declare iarId: string

  @column()
  declare purchaseOrderId: string

  @column()
  declare eventType: string

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
  declare lastError: string | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null

  @belongsTo(() => InspectionAcceptanceReport, { foreignKey: 'iarId' })
  declare iar: BelongsTo<typeof InspectionAcceptanceReport>

  @belongsTo(() => PurchaseOrder)
  declare purchaseOrder: BelongsTo<typeof PurchaseOrder>
}
