import { t } from '#modules/documents/helpers/db_schema'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'
import { forTenant as tenantScope } from '#modules/documents/domain/scopes/tenant_scopes'
import Tenant from '#modules/documents/models/tenant'
import Document from '#modules/documents/models/document'
import RecordRequest from '#modules/documents/models/record_request'

export default class RecordRequestItem extends BaseModel {
  static table = t('record_request_items')
  static forTenant = tenantScope

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare tenantId: string

  @column()
  declare recordRequestId: string

  @column()
  declare documentId: string

  @column()
  declare status: string

  @column()
  declare notes: string | null

  @column.dateTime()
  declare releasedAt: DateTime | null

  @column.dateTime()
  declare returnedAt: DateTime | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null

  @belongsTo(() => Tenant)
  declare tenant: BelongsTo<typeof Tenant>

  @belongsTo(() => RecordRequest)
  declare recordRequest: BelongsTo<typeof RecordRequest>

  @belongsTo(() => Document)
  declare document: BelongsTo<typeof Document>
}
