import { BaseModel, column, belongsTo, hasMany } from '@adonisjs/lucid/orm'
import { t } from '#modules/enrollment/helpers/db_schema'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'
import Organization from '#modules/enrollment/models/organization'
import Asset from '#modules/enrollment/models/asset'
import AssetDepreciationEntry from '#modules/enrollment/models/asset_depreciation_entry'

export default class AssetDepreciationProfile extends BaseModel {
  static table = t('asset_depreciation_profiles')

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare organizationId: string

  @column()
  declare assetId: string

  @column()
  declare method: string

  @column()
  declare usefulLifeMonths: number

  @column({ consume: (v) => Number(v) })
  declare residualRate: number

  @column({ consume: (v) => Number(v) })
  declare acquisitionCost: number

  @column.date()
  declare inServiceDate: DateTime

  @column({ consume: (v) => Number(v) })
  declare accumDepr: number

  @column({ consume: (v) => Number(v) })
  declare bookValue: number

  @column()
  declare active: boolean

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null

  @belongsTo(() => Organization)
  declare organization: BelongsTo<typeof Organization>

  @belongsTo(() => Asset)
  declare asset: BelongsTo<typeof Asset>

  @hasMany(() => AssetDepreciationEntry, { foreignKey: 'profileId' })
  declare entries: HasMany<typeof AssetDepreciationEntry>
}
