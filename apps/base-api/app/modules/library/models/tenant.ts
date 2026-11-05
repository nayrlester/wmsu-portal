import { DateTime } from 'luxon'
import { BaseModel, column, hasMany } from '@adonisjs/lucid/orm'
import type { HasMany } from '@adonisjs/lucid/types/relations'
import User from '#modules/library/models/user'
import Role from '#modules/library/models/role'
import { t } from '#modules/library/helpers/db_schema'

export type TenantType =
  | 'school'
  | 'university'
  | 'public_library'
  | 'corporate'
  | 'government'

export type TenantStatus = 'provisioning' | 'active' | 'suspended' | 'cancelled'

export default class Tenant extends BaseModel {
  static table = t('tenants')

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare slug: string

  @column()
  declare name: string

  @column()
  declare type: TenantType

  @column()
  declare status: TenantStatus

  @column()
  declare timezone: string

  @column()
  declare locale: string

  @column()
  declare logoUrl: string | null

  @column()
  declare primaryColor: string | null

  @column()
  declare reportScheduleCron: string | null

  @column()
  declare reportScheduleEmails: string | null

  @column()
  declare reportScheduleEnabled: boolean

  @column()
  declare platformOrganizationId: string | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null

  @hasMany(() => User)
  declare users: HasMany<typeof User>

  @hasMany(() => Role)
  declare roles: HasMany<typeof Role>
}
