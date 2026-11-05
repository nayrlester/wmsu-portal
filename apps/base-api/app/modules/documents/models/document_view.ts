import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'
import Document from '#modules/documents/models/document'
import User from '#modules/documents/models/user'
import Tenant from '#modules/documents/models/tenant'
import { t } from '#modules/documents/helpers/db_schema'

export default class DocumentView extends BaseModel {
  static table = t('document_views')

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare tenantId: string

  @column()
  declare documentId: string

  @column()
  declare userId: string

  @column.dateTime()
  declare viewedAt: DateTime

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @belongsTo(() => Tenant)
  declare tenant: BelongsTo<typeof Tenant>

  @belongsTo(() => Document)
  declare document: BelongsTo<typeof Document>

  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>
}
