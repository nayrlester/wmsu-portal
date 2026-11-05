import { t } from '#modules/documents/helpers/db_schema'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'
import Document from '#modules/documents/models/document'
import Workflow from '#modules/documents/models/workflow'
import type { WorkflowInstanceState } from '#modules/documents/domain/workflows/workflow_types'

export default class DocumentWorkflowInstance extends BaseModel {
  static table = t('document_workflow_instances')

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare tenantId: string

  @column()
  declare documentId: string

  @column()
  declare versionId: string | null

  @column()
  declare workflowId: string

  @column()
  declare status: string

  @column()
  declare currentNodeId: string | null

  @column()
  declare state: WorkflowInstanceState | null

  @column.dateTime()
  declare startedAt: DateTime

  @column.dateTime()
  declare completedAt: DateTime | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null

  @belongsTo(() => Document)
  declare document: BelongsTo<typeof Document>

  @belongsTo(() => Workflow)
  declare workflow: BelongsTo<typeof Workflow>
}
