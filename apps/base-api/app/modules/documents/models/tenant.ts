import { t } from '#modules/documents/helpers/db_schema'
import { BaseModel, column, hasMany, hasOne } from '@adonisjs/lucid/orm'
import type { HasMany, HasOne } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'
import User from '#modules/documents/models/user'
import TenantDomain from '#modules/documents/models/tenant_domain'
import TenantBranding from '#modules/documents/models/tenant_branding'
import TenantSetting from '#modules/documents/models/tenant_setting'
import Subscription from '#modules/documents/models/subscription'

export default class Tenant extends BaseModel {
  static table = t('tenants')

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare name: string

  @column()
  declare slug: string

  @column()
  declare status: string

  @column()
  declare planTier: string | null

  @column()
  declare platformOrganizationId: string | null

  @column.dateTime()
  declare trialEndsAt: DateTime | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null

  @column.dateTime()
  declare deletedAt: DateTime | null

  @hasMany(() => TenantDomain)
  declare domains: HasMany<typeof TenantDomain>

  @hasOne(() => TenantBranding)
  declare branding: HasOne<typeof TenantBranding>

  @hasOne(() => TenantSetting)
  declare settings: HasOne<typeof TenantSetting>

  @hasMany(() => User)
  declare users: HasMany<typeof User>

  @hasMany(() => Subscription)
  declare subscriptions: HasMany<typeof Subscription>
}
