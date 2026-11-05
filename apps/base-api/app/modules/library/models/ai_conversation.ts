import { DateTime } from 'luxon'
import { BaseModel, column, hasMany } from '@adonisjs/lucid/orm'
import type { HasMany } from '@adonisjs/lucid/types/relations'
import AiMessage from '#modules/library/models/ai_message'
import { t } from '#modules/library/helpers/db_schema'

export default class AiConversation extends BaseModel {
  static table = t('ai_conversations')

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare tenantId: string

  @column()
  declare userId: string

  @column()
  declare title: string | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null

  @hasMany(() => AiMessage)
  declare messages: HasMany<typeof AiMessage>
}
