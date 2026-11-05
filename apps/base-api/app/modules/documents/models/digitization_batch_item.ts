import { t } from '#modules/documents/helpers/db_schema'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'
import { forTenant as tenantScope } from '#modules/documents/domain/scopes/tenant_scopes'
import Tenant from '#modules/documents/models/tenant'
import User from '#modules/documents/models/user'
import Document from '#modules/documents/models/document'
import DigitizationBatch from '#modules/documents/models/digitization_batch'

export type IndexingChecklistItem = {
  key: string
  label: string
  done: boolean
}

export default class DigitizationBatchItem extends BaseModel {
  static table = t('digitization_batch_items')
  static forTenant = tenantScope

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare tenantId: string

  @column()
  declare batchId: string

  @column()
  declare documentId: string | null

  @column()
  declare label: string

  @column()
  declare status: string

  @column()
  declare ocrQaStatus: string

  @column({
    prepare: (value: unknown) =>
      value === null || value === undefined ? '[]' : JSON.stringify(value),
    consume: (value: string | IndexingChecklistItem[]) => {
      if (!value) return []
      if (typeof value === 'string') {
        try {
          return JSON.parse(value) as IndexingChecklistItem[]
        } catch {
          return []
        }
      }
      return value
    },
  })
  declare indexingChecklist: IndexingChecklistItem[]

  @column()
  declare physicalBoxId: string | null

  @column()
  declare physicalFolderId: string | null

  @column()
  declare qaNotes: string | null

  @column()
  declare qaReviewedById: string | null

  @column()
  declare ocrConfidence: number | null

  @column()
  declare ocrJobId: string | null

  @column()
  declare contentHash: string | null

  @column()
  declare pageCount: number | null

  @column()
  declare primaryFileId: string | null

  @column.dateTime()
  declare qaReviewedAt: DateTime | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null

  @belongsTo(() => Tenant)
  declare tenant: BelongsTo<typeof Tenant>

  @belongsTo(() => DigitizationBatch, { foreignKey: 'batchId' })
  declare batch: BelongsTo<typeof DigitizationBatch>

  @belongsTo(() => Document)
  declare document: BelongsTo<typeof Document>

  @belongsTo(() => User, { foreignKey: 'qaReviewedById' })
  declare qaReviewedBy: BelongsTo<typeof User>
}
