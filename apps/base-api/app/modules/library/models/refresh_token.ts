import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import User from '#modules/library/models/user'
import { t } from '#modules/library/helpers/db_schema'

export default class RefreshToken extends BaseModel {
  static table = t('refresh_tokens')

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare userId: string

  @column()
  declare tokenHash: string

  @column.dateTime()
  declare expiresAt: DateTime

  @column.dateTime()
  declare revokedAt: DateTime | null

  @column()
  declare userAgent: string | null

  @column()
  declare ipAddress: string | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>
}
