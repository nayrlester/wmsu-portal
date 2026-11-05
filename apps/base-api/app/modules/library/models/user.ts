import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo, manyToMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, ManyToMany } from '@adonisjs/lucid/types/relations'
import Tenant from '#modules/library/models/tenant'
import Role from '#modules/library/models/role'
import { t } from '#modules/library/helpers/db_schema'

export type UserStatus = 'invited' | 'active' | 'suspended' | 'deactivated'

export default class User extends BaseModel {
  static table = t('users')

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare tenantId: string

  @column()
  declare email: string

  @column({ serializeAs: null })
  declare password: string

  @column()
  declare fullName: string

  @column()
  declare status: UserStatus

  @column()
  declare platformUserId: string | null

  @column.dateTime()
  declare emailVerifiedAt: DateTime | null

  @column.dateTime()
  declare lastLoginAt: DateTime | null

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
    pivotColumns: ['assigned_at', 'assigned_by'],
  })
  declare roles: ManyToMany<typeof Role>

  get initials(): string {
    const parts = this.fullName.trim().split(/\s+/)
    if (parts.length >= 2) {
      return `${parts[0]!.charAt(0)}${parts[1]!.charAt(0)}`.toUpperCase()
    }
    return this.fullName.slice(0, 2).toUpperCase()
  }
}
