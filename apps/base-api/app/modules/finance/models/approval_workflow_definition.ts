import { BaseModel, column, belongsTo, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'
import { t } from '#modules/finance/helpers/db_schema'
import Organization from '#modules/finance/models/organization'
import ApprovalWorkflowStep from '#modules/finance/models/approval_workflow_step'

export default class ApprovalWorkflowDefinition extends BaseModel {
  static table = t('approval_workflow_definitions')

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare organizationId: string

  @column()
  declare code: string

  @column()
  declare name: string

  @column()
  declare entityType: string

  @column()
  declare isActive: boolean

  @column()
  declare createdBy: string | null

  @column()
  declare updatedBy: string | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null

  @belongsTo(() => Organization)
  declare organization: BelongsTo<typeof Organization>

  @hasMany(() => ApprovalWorkflowStep, { foreignKey: 'workflowId' })
  declare steps: HasMany<typeof ApprovalWorkflowStep>
}
