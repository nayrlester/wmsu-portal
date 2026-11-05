import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import { t } from '#modules/finance/helpers/db_schema'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'
import ProcurementAbstract from '#modules/finance/models/procurement_abstract'
import ProcurementQuotation from '#modules/finance/models/procurement_quotation'

export default class ProcurementAbstractLine extends BaseModel {
  static table = t('procurement_abstract_lines')

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare organizationId: string

  @column()
  declare abstractId: string

  @column()
  declare quotationId: string

  @column()
  declare lineNo: number

  @column()
  declare remarks: string | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @belongsTo(() => ProcurementAbstract, { foreignKey: 'abstractId' })
  declare abstract: BelongsTo<typeof ProcurementAbstract>

  @belongsTo(() => ProcurementQuotation)
  declare quotation: BelongsTo<typeof ProcurementQuotation>
}
