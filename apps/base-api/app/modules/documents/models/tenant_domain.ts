import { t } from '#modules/documents/helpers/db_schema'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'
import Tenant from '#modules/documents/models/tenant'

export default class TenantDomain extends BaseModel {
  static table = t('tenant_domains')

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare tenantId: string

  @column()
  declare domain: string

  @column()
  declare isPrimary: boolean

  @column()
  declare isVerified: boolean

  @column()
  declare verificationTokenHash: string | null

  @column.dateTime()
  declare verificationExpiresAt: DateTime | null

  @column.dateTime()
  declare verifiedAt: DateTime | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null

  @belongsTo(() => Tenant)
  declare tenant: BelongsTo<typeof Tenant>
}
