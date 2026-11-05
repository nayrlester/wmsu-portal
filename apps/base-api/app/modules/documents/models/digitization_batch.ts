import { t } from '#modules/documents/helpers/db_schema'
import { BaseModel, column, belongsTo, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'
import { forTenant as tenantScope } from '#modules/documents/domain/scopes/tenant_scopes'
import Tenant from '#modules/documents/models/tenant'
import User from '#modules/documents/models/user'
import DigitizationBatchItem from '#modules/documents/models/digitization_batch_item'

export default class DigitizationBatch extends BaseModel {
  static table = t('digitization_batches')
  static forTenant = tenantScope

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare tenantId: string

  @column()
  declare batchNumber: string

  @column()
  declare title: string

  @column()
  declare status: string

  @column()
  declare notes: string | null

  @column()
  declare createdById: string | null

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

  @hasMany(() => DigitizationBatchItem, { foreignKey: 'batchId' })
  declare items: HasMany<typeof DigitizationBatchItem>
}
