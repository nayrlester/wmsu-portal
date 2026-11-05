import { t } from '#modules/documents/helpers/db_schema'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'
import Document from '#modules/documents/models/document'
import DocumentFile from '#modules/documents/models/document_file'
import Tenant from '#modules/documents/models/tenant'
import type { IntelligenceAnalysisResult, IntelligenceTask } from '#modules/documents/domain/intelligence/intelligence_types'

export default class DocumentIntelligenceJob extends BaseModel {
  static table = t('document_intelligence_jobs')

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare tenantId: string

  @column()
  declare documentId: string

  @column()
  declare fileId: string

  @column()
  declare status: string

  @column({
    prepare: (value: IntelligenceTask[]) => JSON.stringify(value),
    consume: (value: string | IntelligenceTask[]) =>
      typeof value === 'string' ? (JSON.parse(value) as IntelligenceTask[]) : value,
  })
  declare tasks: IntelligenceTask[]

  @column()
  declare ocrProvider: string | null

  @column()
  declare aiProvider: string | null

  @column({
    prepare: (value: IntelligenceAnalysisResult | null) =>
      value ? JSON.stringify(value) : null,
    consume: (value: string | IntelligenceAnalysisResult | null) =>
      typeof value === 'string' ? (JSON.parse(value) as IntelligenceAnalysisResult) : value,
  })
  declare result: IntelligenceAnalysisResult | null

  @column()
  declare errorMessage: string | null

  @column.dateTime()
  declare startedAt: DateTime | null

  @column.dateTime()
  declare completedAt: DateTime | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null

  @belongsTo(() => Tenant)
  declare tenant: BelongsTo<typeof Tenant>

  @belongsTo(() => Document)
  declare document: BelongsTo<typeof Document>

  @belongsTo(() => DocumentFile, { foreignKey: 'fileId' })
  declare file: BelongsTo<typeof DocumentFile>
}
