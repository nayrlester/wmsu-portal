import { t } from '#modules/documents/helpers/db_schema'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'
import Workflow from '#modules/documents/models/workflow'

export default class WorkflowStep extends BaseModel {
  static table = t('workflow_steps')

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare workflowId: string

  @column()
  declare nodeId: string

  @column()
  declare name: string

  @column()
  declare stepType: string

  @column()
  declare orderIndex: number

  @column()
  declare assigneeRoleId: string | null

  @column()
  declare assigneeUserId: string | null

  @column()
  declare assigneeDepartmentId: string | null

  @column()
  declare conditions: Record<string, unknown> | null

  @column()
  declare slaHours: number | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @belongsTo(() => Workflow)
  declare workflow: BelongsTo<typeof Workflow>
}
