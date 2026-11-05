import { BaseModel, column, hasMany, belongsTo } from '@adonisjs/lucid/orm'
import { t } from '#modules/finance/helpers/db_schema'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'
import ProcurementRfq from '#modules/finance/models/procurement_rfq'
import ProcurementAbstractLine from '#modules/finance/models/procurement_abstract_line'

export default class ProcurementAbstract extends BaseModel {
  static table = t('procurement_abstracts')

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare organizationId: string

  @column()
  declare rfqId: string

  @column()
  declare abstractNumber: string

  @column()
  declare status: string

  @column()
  declare notes: string | null

  @column.dateTime()
  declare preparedAt: DateTime | null

  @column()
  declare preparedBy: string | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null

  @belongsTo(() => ProcurementRfq, { foreignKey: 'rfqId' })
  declare rfq: BelongsTo<typeof ProcurementRfq>

  @hasMany(() => ProcurementAbstractLine, { foreignKey: 'abstractId' })
  declare lines: HasMany<typeof ProcurementAbstractLine>
}
