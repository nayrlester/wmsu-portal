import { t } from '#modules/documents/helpers/db_schema'
import { BaseModel, column, belongsTo, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'
import { forTenant as tenantScope } from '#modules/documents/domain/scopes/tenant_scopes'
import Tenant from '#modules/documents/models/tenant'
import User from '#modules/documents/models/user'
import Department from '#modules/documents/models/department'
import RecordRequestItem from '#modules/documents/models/record_request_item'
import ReleaseEvent from '#modules/documents/models/release_event'

export default class RecordRequest extends BaseModel {
  static table = t('record_requests')
  static forTenant = tenantScope

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare tenantId: string

  @column()
  declare requestNumber: string

  @column()
  declare status: string

  @column()
  declare requestingOfficeId: string | null

  @column()
  declare requesterId: string

  @column()
  declare approverId: string | null

  @column()
  declare fulfilledById: string | null

  @column()
  declare purpose: string

  @column()
  declare accessMode: string

  @column.dateTime()
  declare neededBy: DateTime | null

  @column.dateTime()
  declare dueAt: DateTime | null

  @column()
  declare denialReason: string | null

  @column()
  declare notes: string | null

  @column.dateTime()
  declare approvedAt: DateTime | null

  @column.dateTime()
  declare releasedAt: DateTime | null

  @column.dateTime()
  declare returnedAt: DateTime | null

  @column.dateTime()
  declare cancelledAt: DateTime | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null

  @belongsTo(() => Tenant)
  declare tenant: BelongsTo<typeof Tenant>

  @belongsTo(() => Department, { foreignKey: 'requestingOfficeId' })
  declare requestingOffice: BelongsTo<typeof Department>

  @belongsTo(() => User, { foreignKey: 'requesterId' })
  declare requester: BelongsTo<typeof User>

  @belongsTo(() => User, { foreignKey: 'approverId' })
  declare approver: BelongsTo<typeof User>

  @belongsTo(() => User, { foreignKey: 'fulfilledById' })
  declare fulfilledBy: BelongsTo<typeof User>

  @hasMany(() => RecordRequestItem)
  declare items: HasMany<typeof RecordRequestItem>

  @hasMany(() => ReleaseEvent)
  declare events: HasMany<typeof ReleaseEvent>
}
