import { t } from '#modules/documents/helpers/db_schema'
import { BaseModel, column, belongsTo, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'
import Tenant from '#modules/documents/models/tenant'
import User from '#modules/documents/models/user'
import WorkflowStep from '#modules/documents/models/workflow_step'

export default class Workflow extends BaseModel {
  static table = t('workflows')

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare tenantId: string

  @column()
  declare name: string

  @column()
  declare description: string | null

  @column()
  declare status: string

  @column()
  declare version: number

  @column()
  declare definition: Record<string, unknown>

  @column()
  declare createdById: string

  @column.dateTime()
  declare publishedAt: DateTime | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null

  @column.dateTime()
  declare deletedAt: DateTime | null

  @belongsTo(() => Tenant)
  declare tenant: BelongsTo<typeof Tenant>

  @belongsTo(() => User, { foreignKey: 'createdById' })
  declare createdBy: BelongsTo<typeof User>

  @hasMany(() => WorkflowStep)
  declare steps: HasMany<typeof WorkflowStep>
}
