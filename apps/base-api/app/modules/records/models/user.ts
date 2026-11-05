import { BaseModel, column, belongsTo, manyToMany } from '@adonisjs/lucid/orm'
import { t } from '#modules/records/helpers/db_schema'
import type { BelongsTo, ManyToMany } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'
import hash from '@adonisjs/core/services/hash'
import { compose } from '@adonisjs/core/helpers'
import { withAuthFinder } from '@adonisjs/auth/mixins/lucid'
import { DbAccessTokensProvider, type AccessToken } from '@adonisjs/auth/access_tokens'
import Role from '#modules/records/models/role'
import Organization from '#modules/records/models/organization'

const AuthFinder = withAuthFinder(() => hash.use('scrypt'), {
  uids: ['email'],
  passwordColumnName: 'password',
})

export default class User extends compose(BaseModel, AuthFinder) {
  static table = t('users')

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare organizationId: string

  @column()
  declare email: string

  @column({ serializeAs: null })
  declare password: string

  @column()
  declare fullName: string

  @column()
  declare platformUserId: string | null

  @column()
  declare status: string

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @column.dateTime()
  declare deletedAt: DateTime | null

  @belongsTo(() => Organization)
  declare organization: BelongsTo<typeof Organization>

  @manyToMany(() => Role, {
    pivotTable: t('user_roles'),
    pivotForeignKey: 'user_id',
    pivotRelatedForeignKey: 'role_id',
    pivotColumns: ['organization_id'],
  })
  declare roles: ManyToMany<typeof Role>

  static accessTokens = DbAccessTokensProvider.forModel(User, {
    table: t('auth_access_tokens'),
  })

  declare currentAccessToken?: AccessToken

  get isAdmin(): boolean {
    if (!this.$preloaded.roles) return false
    return this.roles.some((r) => r.slug === 'admin')
  }
}
