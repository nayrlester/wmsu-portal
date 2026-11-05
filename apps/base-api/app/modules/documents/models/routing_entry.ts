import { t } from '#modules/documents/helpers/db_schema'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'
import Document from '#modules/documents/models/document'
import User from '#modules/documents/models/user'
import Department from '#modules/documents/models/department'

export default class RoutingEntry extends BaseModel {
  static table = t('routing_entries')

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare tenantId: string

  @column()
  declare documentId: string

  @column()
  declare fromUserId: string | null

  @column()
  declare toUserId: string | null

  @column()
  declare fromDepartmentId: string | null

  @column()
  declare toDepartmentId: string | null

  @column()
  declare action: string

  @column()
  declare remarks: string | null

  @column.dateTime()
  declare routedAt: DateTime

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @belongsTo(() => Document)
  declare document: BelongsTo<typeof Document>

  @belongsTo(() => User, { foreignKey: 'fromUserId' })
  declare fromUser: BelongsTo<typeof User>

  @belongsTo(() => User, { foreignKey: 'toUserId' })
  declare toUser: BelongsTo<typeof User>

  @belongsTo(() => Department, { foreignKey: 'fromDepartmentId' })
  declare fromDepartment: BelongsTo<typeof Department>

  @belongsTo(() => Department, { foreignKey: 'toDepartmentId' })
  declare toDepartment: BelongsTo<typeof Department>
}
