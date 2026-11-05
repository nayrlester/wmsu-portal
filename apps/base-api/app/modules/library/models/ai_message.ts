import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import AiConversation from '#modules/library/models/ai_conversation'
import { t } from '#modules/library/helpers/db_schema'

export type AiMessageRole = 'user' | 'assistant' | 'system'

export interface AiToolCallRecord {
  name: string
  input: Record<string, unknown>
  result?: unknown
}

export default class AiMessage extends BaseModel {
  static table = t('ai_messages')

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare conversationId: string

  @column()
  declare role: AiMessageRole

  @column()
  declare content: string

  @column({
    columnName: 'tool_calls',
    prepare: (value: AiToolCallRecord[] | null) =>
      value ? JSON.stringify(value) : null,
    consume: (value: string | AiToolCallRecord[] | null) => {
      if (!value) return null
      if (typeof value === 'string') return JSON.parse(value) as AiToolCallRecord[]
      return value
    },
  })
  declare toolCalls: AiToolCallRecord[] | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @belongsTo(() => AiConversation)
  declare conversation: BelongsTo<typeof AiConversation>
}
