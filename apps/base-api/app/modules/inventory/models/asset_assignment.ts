import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import { t } from '#modules/inventory/helpers/db_schema'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'
import Organization from '#modules/inventory/models/organization'
import Asset from '#modules/inventory/models/asset'
import User from '#modules/inventory/models/user'

export default class AssetAssignment extends BaseModel {
  static table = t('asset_assignments')

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare organizationId: string

  @column()
  declare assetId: string

  @column()
  declare custodianExternalId: string

  @column()
  declare custodianName: string | null

  @column()
  declare custodianEmail: string | null

  @column.dateTime()
  declare assignedAt: DateTime

  @column()
  declare assignedBy: string | null

  @column.dateTime()
  declare expectedReturnAt: DateTime | null

  @column.dateTime()
  declare returnedAt: DateTime | null

  @column()
  declare returnedBy: string | null

  @column()
  declare returnCondition: string | null

  @column()
  declare returnNotes: string | null

  @column()
  declare status: string

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @belongsTo(() => Organization)
  declare organization: BelongsTo<typeof Organization>

  @belongsTo(() => Asset)
  declare asset: BelongsTo<typeof Asset>

  @belongsTo(() => User, { foreignKey: 'assignedBy' })
  declare assigner: BelongsTo<typeof User>

  @belongsTo(() => User, { foreignKey: 'returnedBy' })
  declare returner: BelongsTo<typeof User>
}
