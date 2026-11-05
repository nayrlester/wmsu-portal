import { BaseModel, column, belongsTo, hasMany } from '@adonisjs/lucid/orm'
import { t } from '#modules/finance/helpers/db_schema'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'
import Organization from '#modules/finance/models/organization'
import Office from '#modules/finance/models/office'
import User from '#modules/finance/models/user'
import SupplyRequisitionLine from '#modules/finance/models/supply_requisition_line'

export default class SupplyRequisition extends BaseModel {
  static table = t('supply_requisitions')

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare organizationId: string

  @column()
  declare requisitionNo: string

  @column()
  declare requestingOfficeId: string | null

  @column()
  declare requestedBy: string | null

  @column()
  declare status: string

  @column()
  declare purpose: string | null

  @column()
  declare approvedBy: string | null

  @column.dateTime()
  declare approvedAt: DateTime | null

  @column.dateTime()
  declare fulfilledAt: DateTime | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null

  @belongsTo(() => Organization)
  declare organization: BelongsTo<typeof Organization>

  @belongsTo(() => Office, { foreignKey: 'requestingOfficeId' })
  declare requestingOffice: BelongsTo<typeof Office>

  @belongsTo(() => User, { foreignKey: 'requestedBy' })
  declare requester: BelongsTo<typeof User>

  @belongsTo(() => User, { foreignKey: 'approvedBy' })
  declare approver: BelongsTo<typeof User>

  @hasMany(() => SupplyRequisitionLine, { foreignKey: 'requisitionId' })
  declare lines: HasMany<typeof SupplyRequisitionLine>
}
