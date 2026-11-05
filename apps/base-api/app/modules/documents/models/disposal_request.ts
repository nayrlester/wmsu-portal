import { t } from '#modules/documents/helpers/db_schema'
import { BaseModel, column, belongsTo, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'
import { forTenant as tenantScope } from '#modules/documents/domain/scopes/tenant_scopes'
import Tenant from '#modules/documents/models/tenant'
import User from '#modules/documents/models/user'
import DisposalRequestItem from '#modules/documents/models/disposal_request_item'

export default class DisposalRequest extends BaseModel {
  static table = t('disposal_requests')
  static forTenant = tenantScope

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare tenantId: string

  @column()
  declare requestNumber: string

  @column()
  declare title: string

  @column()
  declare status: string

  @column()
  declare justification: string

  @column()
  declare certificateNumber: string | null

  @column()
  declare certificateNotes: string | null

  @column()
  declare createdById: string | null

  @column()
  declare approvedById: string | null

  @column.dateTime()
  declare approvedAt: DateTime | null

  @column.dateTime()
  declare disposedAt: DateTime | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null

  @belongsTo(() => Tenant)
  declare tenant: BelongsTo<typeof Tenant>

  @belongsTo(() => User, { foreignKey: 'createdById' })
  declare createdBy: BelongsTo<typeof User>

  @belongsTo(() => User, { foreignKey: 'approvedById' })
  declare approvedBy: BelongsTo<typeof User>

  @hasMany(() => DisposalRequestItem, { foreignKey: 'disposalRequestId' })
  declare items: HasMany<typeof DisposalRequestItem>
}
