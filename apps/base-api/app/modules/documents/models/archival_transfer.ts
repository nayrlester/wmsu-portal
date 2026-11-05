import { t } from '#modules/documents/helpers/db_schema'
import { BaseModel, column, belongsTo, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'
import { forTenant as tenantScope } from '#modules/documents/domain/scopes/tenant_scopes'
import Tenant from '#modules/documents/models/tenant'
import User from '#modules/documents/models/user'
import ArchivalTransferItem from '#modules/documents/models/archival_transfer_item'

export default class ArchivalTransfer extends BaseModel {
  static table = t('archival_transfers')
  static forTenant = tenantScope

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare tenantId: string

  @column()
  declare transferNumber: string

  @column()
  declare title: string

  @column()
  declare status: string

  @column()
  declare notes: string | null

  @column()
  declare createdById: string | null

  @column()
  declare approvedById: string | null

  @column.dateTime()
  declare approvedAt: DateTime | null

  @column.dateTime()
  declare completedAt: DateTime | null

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

  @hasMany(() => ArchivalTransferItem, { foreignKey: 'transferId' })
  declare items: HasMany<typeof ArchivalTransferItem>
}
