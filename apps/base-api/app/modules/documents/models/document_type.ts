import { t } from '#modules/documents/helpers/db_schema'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'
import Tenant from '#modules/documents/models/tenant'

export default class DocumentType extends BaseModel {
  static table = t('document_types')

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare tenantId: string

  @column()
  declare name: string

  @column()
  declare code: string

  @column()
  declare description: string | null

  @column()
  declare defaultWorkflowId: string | null

  @column()
  declare metadataSchema: Record<string, unknown> | null

  @column()
  declare isActive: boolean

  @column()
  declare createdById: string | null

  @column()
  declare updatedById: string | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null

  @column.dateTime()
  declare deletedAt: DateTime | null

  @belongsTo(() => Tenant)
  declare tenant: BelongsTo<typeof Tenant>
}
