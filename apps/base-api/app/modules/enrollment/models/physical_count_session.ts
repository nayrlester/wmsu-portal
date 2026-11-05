import { BaseModel, column, belongsTo, hasMany } from '@adonisjs/lucid/orm'
import { t } from '#modules/enrollment/helpers/db_schema'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'
import Organization from '#modules/enrollment/models/organization'
import Warehouse from '#modules/enrollment/models/warehouse'
import Campus from '#modules/enrollment/models/campus'
import User from '#modules/enrollment/models/user'
import CoaDocument from '#modules/enrollment/models/coa_document'
import PhysicalCountLine from '#modules/enrollment/models/physical_count_line'

export default class PhysicalCountSession extends BaseModel {
  static table = t('physical_count_sessions')

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare organizationId: string

  @column()
  declare sessionNo: string

  @column()
  declare countType: string

  @column()
  declare warehouseId: string | null

  @column()
  declare campusId: string | null

  @column()
  declare status: string

  @column.date()
  declare scheduledDate: DateTime | null

  @column()
  declare coaDocumentId: string | null

  @column()
  declare createdBy: string | null

  @column.dateTime()
  declare closedAt: DateTime | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null

  @belongsTo(() => Organization)
  declare organization: BelongsTo<typeof Organization>

  @belongsTo(() => Warehouse)
  declare warehouse: BelongsTo<typeof Warehouse>

  @belongsTo(() => Campus)
  declare campus: BelongsTo<typeof Campus>

  @belongsTo(() => CoaDocument, { foreignKey: 'coaDocumentId' })
  declare coaDocument: BelongsTo<typeof CoaDocument>

  @belongsTo(() => User, { foreignKey: 'createdBy' })
  declare creator: BelongsTo<typeof User>

  @hasMany(() => PhysicalCountLine, { foreignKey: 'sessionId' })
  declare lines: HasMany<typeof PhysicalCountLine>
}
