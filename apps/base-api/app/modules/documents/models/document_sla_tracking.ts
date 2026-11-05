import { t } from '#modules/documents/helpers/db_schema'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'
import Document from '#modules/documents/models/document'
import SlaRule from '#modules/documents/models/sla_rule'

export default class DocumentSlaTracking extends BaseModel {
  static table = t('document_sla_tracking')

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare documentId: string

  @column()
  declare slaRuleId: string

  @column.dateTime()
  declare reviewDueAt: DateTime | null

  @column.dateTime()
  declare approvalDueAt: DateTime | null

  @column.dateTime()
  declare completionDueAt: DateTime | null

  @column()
  declare isBreached: boolean

  @column.dateTime()
  declare breachedAt: DateTime | null

  @column.dateTime()
  declare reminderSentAt: DateTime | null

  @column.dateTime()
  declare escalatedAt: DateTime | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null

  @belongsTo(() => Document)
  declare document: BelongsTo<typeof Document>

  @belongsTo(() => SlaRule)
  declare slaRule: BelongsTo<typeof SlaRule>
}
