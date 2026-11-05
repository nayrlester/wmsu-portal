import { t } from '#modules/documents/helpers/db_schema'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'
import User from '#modules/documents/models/user'
import RefreshToken from '#modules/documents/models/refresh_token'

export default class UserSession extends BaseModel {
  static table = t('user_sessions')

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare userId: string

  @column()
  declare refreshTokenId: string | null

  @column()
  declare ipAddress: string | null

  @column()
  declare userAgent: string | null

  @column()
  declare deviceLabel: string | null

  @column()
  declare location: string | null

  @column.dateTime()
  declare lastActiveAt: DateTime

  @column.dateTime()
  declare expiresAt: DateTime

  @column.dateTime()
  declare revokedAt: DateTime | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>

  @belongsTo(() => RefreshToken)
  declare refreshToken: BelongsTo<typeof RefreshToken>

  get isActive(): boolean {
    return !this.revokedAt && this.expiresAt > DateTime.now()
  }
}
