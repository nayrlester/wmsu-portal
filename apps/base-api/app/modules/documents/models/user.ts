import { t } from '#modules/documents/helpers/db_schema'
import { BaseModel, column, belongsTo, hasMany, manyToMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany, ManyToMany } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'
import hash from '@adonisjs/core/services/hash'
import { compose } from '@adonisjs/core/helpers'
import { withAuthFinder } from '@adonisjs/auth/mixins/lucid'
import { DbAccessTokensProvider, type AccessToken } from '@adonisjs/auth/access_tokens'
import Role from '#modules/documents/models/role'
import Tenant from '#modules/documents/models/tenant'
import { DefaultRoleSlug } from '#modules/documents/domain/enums/index'

export default class User extends compose(BaseModel, withAuthFinder(() => hash)) {
  static table = t('users')

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare tenantId: string | null

  @column()
  declare email: string

  @column({ serializeAs: null })
  declare password: string

  @column()
  declare fullName: string | null

  @column()
  declare avatarUrl: string | null

  @column()
  declare phone: string | null

  @column()
  declare status: string

  @column()
  declare isSuperAdmin: boolean

  @column()
  declare emailVerified: boolean

  @column.dateTime()
  declare emailVerifiedAt: DateTime | null

  @column()
  declare mfaSecret: string | null

  @column()
  declare mfaEnabled: boolean

  @column()
  declare oauthProvider: string | null

  @column()
  declare oauthProviderId: string | null

  @column()
  declare platformUserId: string | null

  @column.dateTime()
  declare lastLoginAt: DateTime | null

  @column()
  declare lastLoginIp: string | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null

  @column.dateTime()
  declare deletedAt: DateTime | null

  @belongsTo(() => Tenant)
  declare tenant: BelongsTo<typeof Tenant>

  @manyToMany(() => Role, {
    pivotTable: t('user_roles'),
    pivotForeignKey: 'user_id',
    pivotRelatedForeignKey: 'role_id',
    pivotColumns: ['tenant_id'],
  })
  declare roles: ManyToMany<typeof Role>

  static accessTokens = DbAccessTokensProvider.forModel(User, {
    tokenableProperty: 'id',
  })

  declare currentAccessToken?: AccessToken

  get initials(): string {
    const name = this.fullName ?? this.email
    const parts = name.split(/[\s@]+/)
    if (parts.length >= 2) {
      return `${parts[0]!.charAt(0)}${parts[1]!.charAt(0)}`.toUpperCase()
    }
    return name.slice(0, 2).toUpperCase()
  }

  async hasPermission(permissionSlug: string, tenantId: string): Promise<boolean> {
    if (this.isSuperAdmin) return true
    if (this.tenantId !== tenantId) return false

    await this.load('roles', (query) => {
      query.wherePivot('tenant_id', tenantId).preload('permissions')
    })

    if (this.roles.some((role) => role.slug === DefaultRoleSlug.TENANT_OWNER)) {
      return true
    }

    return this.roles.some((role) =>
      role.permissions.some((permission) => permission.slug === permissionSlug)
    )
  }
}
