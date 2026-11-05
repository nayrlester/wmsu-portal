import { t } from '#modules/documents/helpers/db_schema'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'
import Tenant from '#modules/documents/models/tenant'
import DocumentType from '#modules/documents/models/document_type'

export default class SlaRule extends BaseModel {
  static table = t('sla_rules')

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare tenantId: string

  @column()
  declare name: string

  @column()
  declare documentTypeId: string | null

  @column()
  declare reviewDeadlineHours: number | null

  @column()
  declare approvalDeadlineHours: number | null

  @column()
  declare completionDeadlineHours: number | null

  @column()
  declare escalationRules: Record<string, unknown> | null

  @column()
  declare isActive: boolean

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null

  @belongsTo(() => Tenant)
  declare tenant: BelongsTo<typeof Tenant>

  @belongsTo(() => DocumentType)
  declare documentType: BelongsTo<typeof DocumentType>
}
