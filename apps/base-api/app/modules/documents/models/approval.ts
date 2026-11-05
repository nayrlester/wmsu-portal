import { t } from '#modules/documents/helpers/db_schema'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'
import Document from '#modules/documents/models/document'
import User from '#modules/documents/models/user'

export default class Approval extends BaseModel {
  static table = t('approvals')

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare tenantId: string

  @column()
  declare documentId: string

  @column()
  declare workflowInstanceId: string | null

  @column()
  declare approverId: string

  @column()
  declare action: string

  @column()
  declare comments: string | null

  @column()
  declare stepNodeId: string | null

  @column.dateTime()
  declare actedAt: DateTime

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @belongsTo(() => Document)
  declare document: BelongsTo<typeof Document>

  @belongsTo(() => User, { foreignKey: 'approverId' })
  declare approver: BelongsTo<typeof User>
}
