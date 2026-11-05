import { BaseModel, column, belongsTo, hasMany } from '@adonisjs/lucid/orm'
import { t } from '#modules/enrollment/helpers/db_schema'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'
import Organization from '#modules/enrollment/models/organization'
import Office from '#modules/enrollment/models/office'
import User from '#modules/enrollment/models/user'
import AssetAssignment from '#modules/enrollment/models/asset_assignment'
import AssetMaintenanceRecord from '#modules/enrollment/models/asset_maintenance_record'
import AssetLifecycleEvent from '#modules/enrollment/models/asset_lifecycle_event'

export default class Asset extends BaseModel {
  static table = t('assets')

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare organizationId: string

  @column()
  declare assetCode: string

  @column()
  declare propertyNumber: string | null

  @column()
  declare barcode: string | null

  @column()
  declare name: string

  @column()
  declare description: string | null

  @column()
  declare assetType: string

  @column()
  declare serialNumber: string | null

  @column()
  declare model: string | null

  @column()
  declare manufacturer: string | null

  @column()
  declare fundSource: string | null

  @column()
  declare officeId: string | null

  @column()
  declare purchaseDate: string | null

  @column({ consume: (v) => (v == null ? null : Number(v)) })
  declare purchaseCost: number | null

  @column()
  declare warrantyExpiresAt: string | null

  @column()
  declare status: string

  @column()
  declare lifecycleStage: string

  @column()
  declare currentAssignmentId: string | null

  @column()
  declare custodianExternalId: string | null

  @column()
  declare custodianName: string | null

  @column()
  declare custodianEmail: string | null

  @column()
  declare qrPayload: string | null

  @column()
  declare usefulLifeMonths: number | null

  @column({ consume: (v) => (v == null ? null : Number(v)) })
  declare residualRate: number | null

  @column()
  declare notes: string | null

  @column()
  declare createdBy: string | null

  @column()
  declare updatedBy: string | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @column.dateTime()
  declare deletedAt: DateTime | null

  @belongsTo(() => Organization)
  declare organization: BelongsTo<typeof Organization>

  @belongsTo(() => Office)
  declare office: BelongsTo<typeof Office>

  @belongsTo(() => User, { foreignKey: 'createdBy' })
  declare creator: BelongsTo<typeof User>

  @belongsTo(() => User, { foreignKey: 'updatedBy' })
  declare updater: BelongsTo<typeof User>

  @belongsTo(() => AssetAssignment, { foreignKey: 'currentAssignmentId' })
  declare currentAssignment: BelongsTo<typeof AssetAssignment>

  @hasMany(() => AssetAssignment)
  declare assignments: HasMany<typeof AssetAssignment>

  @hasMany(() => AssetMaintenanceRecord)
  declare maintenanceRecords: HasMany<typeof AssetMaintenanceRecord>

  @hasMany(() => AssetLifecycleEvent)
  declare lifecycleEvents: HasMany<typeof AssetLifecycleEvent>
}
