import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'
import { t } from '#modules/finance/helpers/db_schema'
import Organization from '#modules/finance/models/organization'
import ApprovalWorkflowDefinition from '#modules/finance/models/approval_workflow_definition'

export default class ApprovalWorkflowStep extends BaseModel {
  static table = t('approval_workflow_steps')

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare organizationId: string

  @column()
  declare workflowId: string

  @column()
  declare stepOrder: number

  @column()
  declare name: string

  @column()
  declare requiredPermission: string | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null

  @belongsTo(() => Organization)
  declare organization: BelongsTo<typeof Organization>

  @belongsTo(() => ApprovalWorkflowDefinition, { foreignKey: 'workflowId' })
  declare workflow: BelongsTo<typeof ApprovalWorkflowDefinition>
}
