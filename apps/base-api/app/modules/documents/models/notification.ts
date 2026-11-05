import { t } from '#modules/documents/helpers/db_schema'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'
import User from '#modules/documents/models/user'
import Tenant from '#modules/documents/models/tenant'

export default class Notification extends BaseModel {
  static table = t('notifications')

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare tenantId: string

  @column()
  declare userId: string

  @column()
  declare type: string

  @column()
  declare title: string

  @column()
  declare body: string | null

  @column()
  declare data: Record<string, unknown> | null

  @column()
  declare channel: string

  @column()
  declare isRead: boolean

  @column.dateTime()
  declare readAt: DateTime | null

  @column.dateTime()
  declare sentAt: DateTime | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime()
  declare deletedAt: DateTime | null

  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>

  @belongsTo(() => Tenant)
  declare tenant: BelongsTo<typeof Tenant>
}
