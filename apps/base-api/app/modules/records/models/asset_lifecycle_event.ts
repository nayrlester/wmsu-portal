import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import { t } from '#modules/records/helpers/db_schema'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'
import Organization from '#modules/records/models/organization'
import Asset from '#modules/records/models/asset'
import User from '#modules/records/models/user'

export default class AssetLifecycleEvent extends BaseModel {
  static table = t('asset_lifecycle_events')

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare organizationId: string

  @column()
  declare assetId: string

  @column()
  declare eventType: string

  @column()
  declare fromStatus: string | null

  @column()
  declare toStatus: string | null

  @column()
  declare metadata: Record<string, unknown> | null

  @column.dateTime()
  declare occurredAt: DateTime

  @column()
  declare actorUserId: string | null

  @belongsTo(() => Organization)
  declare organization: BelongsTo<typeof Organization>

  @belongsTo(() => Asset)
  declare asset: BelongsTo<typeof Asset>

  @belongsTo(() => User, { foreignKey: 'actorUserId' })
  declare actor: BelongsTo<typeof User>
}
