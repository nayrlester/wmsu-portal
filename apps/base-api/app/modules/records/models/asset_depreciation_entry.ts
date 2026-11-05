import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import { t } from '#modules/records/helpers/db_schema'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'
import Organization from '#modules/records/models/organization'
import Asset from '#modules/records/models/asset'
import AssetDepreciationProfile from '#modules/records/models/asset_depreciation_profile'

export default class AssetDepreciationEntry extends BaseModel {
  static table = t('asset_depreciation_entries')

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare organizationId: string

  @column()
  declare profileId: string

  @column()
  declare assetId: string

  @column()
  declare periodYear: number

  @column()
  declare periodMonth: number

  @column({ consume: (v) => Number(v) })
  declare deprAmount: number

  @column({ consume: (v) => Number(v) })
  declare accumDeprAfter: number

  @column({ consume: (v) => Number(v) })
  declare bookValueAfter: number

  @column.dateTime()
  declare postedAt: DateTime

  @belongsTo(() => Organization)
  declare organization: BelongsTo<typeof Organization>

  @belongsTo(() => AssetDepreciationProfile, { foreignKey: 'profileId' })
  declare profile: BelongsTo<typeof AssetDepreciationProfile>

  @belongsTo(() => Asset)
  declare asset: BelongsTo<typeof Asset>
}
