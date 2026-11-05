import { t } from '#modules/documents/helpers/db_schema'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'
import { forTenant as tenantScope } from '#modules/documents/domain/scopes/tenant_scopes'
import Tenant from '#modules/documents/models/tenant'
import User from '#modules/documents/models/user'
import Document from '#modules/documents/models/document'
import RecordRequest from '#modules/documents/models/record_request'
import RecordRequestItem from '#modules/documents/models/record_request_item'

export default class ReleaseEvent extends BaseModel {
  static table = t('release_events')
  static forTenant = tenantScope

  /** Append-only audit rows — no updated_at. */
  static updatedAtColumn = null

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare tenantId: string

  @column()
  declare recordRequestId: string

  @column()
  declare recordRequestItemId: string | null

  @column()
  declare documentId: string | null

  @column()
  declare actorId: string | null

  @column()
  declare eventType: string

  @column()
  declare notes: string | null

  @column()
  declare metadata: Record<string, unknown> | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @belongsTo(() => Tenant)
  declare tenant: BelongsTo<typeof Tenant>

  @belongsTo(() => RecordRequest)
  declare recordRequest: BelongsTo<typeof RecordRequest>

  @belongsTo(() => RecordRequestItem)
  declare recordRequestItem: BelongsTo<typeof RecordRequestItem>

  @belongsTo(() => Document)
  declare document: BelongsTo<typeof Document>

  @belongsTo(() => User, { foreignKey: 'actorId' })
  declare actor: BelongsTo<typeof User>
}
