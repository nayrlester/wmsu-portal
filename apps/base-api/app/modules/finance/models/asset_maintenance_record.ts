import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import { t } from '#modules/finance/helpers/db_schema'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'
import Organization from '#modules/finance/models/organization'
import Asset from '#modules/finance/models/asset'
import User from '#modules/finance/models/user'

export default class AssetMaintenanceRecord extends BaseModel {
  static table = t('asset_maintenance_records')

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare organizationId: string

  @column()
  declare assetId: string

  @column()
  declare title: string

  @column()
  declare description: string | null

  @column()
  declare maintenanceType: string

  @column.dateTime()
  declare scheduledAt: DateTime

  @column.dateTime()
  declare completedAt: DateTime | null

  @column()
  declare status: string

  @column()
  declare assignedToUserId: string | null

  @column({ consume: (v) => (v == null ? null : Number(v)) })
  declare cost: number | null

  @column()
  declare notes: string | null

  @column()
  declare createdBy: string | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @belongsTo(() => Organization)
  declare organization: BelongsTo<typeof Organization>

  @belongsTo(() => Asset)
  declare asset: BelongsTo<typeof Asset>

  @belongsTo(() => User, { foreignKey: 'assignedToUserId' })
  declare assignedTo: BelongsTo<typeof User>

  @belongsTo(() => User, { foreignKey: 'createdBy' })
  declare creator: BelongsTo<typeof User>
}
