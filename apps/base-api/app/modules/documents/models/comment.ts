import { t } from '#modules/documents/helpers/db_schema'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'
import Document from '#modules/documents/models/document'
import User from '#modules/documents/models/user'

export default class Comment extends BaseModel {
  static table = t('comments')

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare tenantId: string

  @column()
  declare documentId: string

  @column()
  declare userId: string

  @column()
  declare body: string

  @column()
  declare mentions: Record<string, unknown> | null

  @column()
  declare parentId: string | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null

  @column.dateTime()
  declare deletedAt: DateTime | null

  @belongsTo(() => Document)
  declare document: BelongsTo<typeof Document>

  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>
}
