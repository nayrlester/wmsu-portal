import { t } from '#modules/documents/helpers/db_schema'
import { DateTime } from 'luxon'
import { BaseModel, belongsTo, column, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import Tenant from '#modules/documents/models/tenant'

export default class DocumentFilePlanNode extends BaseModel {
  static table = t('document_file_plan_nodes')

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare tenantId: string

  @column()
  declare parentId: string | null

  @column()
  declare name: string

  @column()
  declare code: string | null

  @column()
  declare path: string

  @column()
  declare sortOrder: number

  @column()
  declare isActive: boolean

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @column.dateTime()
  declare deletedAt: DateTime | null

  @belongsTo(() => Tenant)
  declare tenant: BelongsTo<typeof Tenant>

  @belongsTo(() => DocumentFilePlanNode, { foreignKey: 'parentId' })
  declare parent: BelongsTo<typeof DocumentFilePlanNode>

  @hasMany(() => DocumentFilePlanNode, { foreignKey: 'parentId' })
  declare children: HasMany<typeof DocumentFilePlanNode>
}
