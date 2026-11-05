import { t } from '#modules/documents/helpers/db_schema'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'
import User from '#modules/documents/models/user'

export default class RefreshToken extends BaseModel {
  static table = t('refresh_tokens')

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare userId: string

  @column()
  declare tokenHash: string

  @column()
  declare userAgent: string | null

  @column()
  declare ipAddress: string | null

  @column()
  declare deviceLabel: string | null

  @column.dateTime()
  declare lastActiveAt: DateTime | null

  @column.dateTime()
  declare expiresAt: DateTime

  @column.dateTime()
  declare revokedAt: DateTime | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>
}
