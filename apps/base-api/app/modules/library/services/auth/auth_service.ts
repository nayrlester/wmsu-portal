import { DateTime } from 'luxon'
import hash from '@adonisjs/core/services/hash'
import db from '@adonisjs/lucid/services/db'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import User from '#modules/library/models/user'
import Tenant from '#modules/library/models/tenant'
import Role from '#modules/library/models/role'
import RefreshToken from '#modules/library/models/refresh_token'
import JwtService from '#modules/library/services/auth/jwt_service'
import RbacService from '#modules/library/services/auth/rbac_service'
import AuditService from '#modules/library/services/audit/audit_service'
import UnauthorizedException from '#modules/library/exceptions/unauthorized_exception'
import env from '#start/env'

export interface AuthTokens {
  accessToken: string
  refreshToken: string
  expiresIn: string
}

export interface AuthUserPayload {
  id: string
  email: string
  fullName: string
  tenantId: string
  roles: string[]
  permissions: string[]
}

export default class AuthService {
  constructor(
    private jwtService = new JwtService(),
    private rbacService = new RbacService(),
    private auditService = new AuditService()
  ) {}

  async registerTenant(input: {
    tenantName: string
    tenantSlug: string
    tenantType: Tenant['type']
    fullName: string
    email: string
    password: string
  }): Promise<{ user: AuthUserPayload; tokens: AuthTokens; tenant: Tenant }> {
    const slug = input.tenantSlug.trim().toLowerCase()
    const email = input.email.trim().toLowerCase()

    const existingTenant = await Tenant.query().where('slug', slug).first()
    if (existingTenant) {
      throw new Error('Tenant slug already exists')
    }

    return db.transaction(async (trx) => {
      const tenant = await Tenant.create(
        {
          name: input.tenantName,
          slug,
          type: input.tenantType,
          status: 'active',
        },
        { client: trx }
      )

      await this.rbacService.seedTenantRoles(tenant.id, trx)

      const adminRole = await Role.query({ client: trx })
        .where('tenant_id', tenant.id)
        .where('code', 'admin')
        .firstOrFail()

      const user = await User.create(
        {
          tenantId: tenant.id,
          email,
          password: await hash.make(input.password),
          fullName: input.fullName,
          status: 'active',
          emailVerifiedAt: DateTime.now(),
        },
        { client: trx }
      )

      await user.related('roles').attach(
        {
          [adminRole.id]: {
            assigned_at: DateTime.now().toSQL(),
          },
        },
        trx
      )

      const { roles, permissions } = await this.rbacService.getUserRolesAndPermissions(
        user.id,
        trx
      )

      const tokens = await this.issueTokens(user, roles, permissions, trx)

      return {
        tenant,
        user: this.toAuthUser(user, roles, permissions),
        tokens,
      }
    })
  }

  async login(
    tenantId: string,
    email: string,
    password: string,
    meta?: { userAgent?: string; ipAddress?: string; requestId?: string }
  ): Promise<{ user: AuthUserPayload; tokens: AuthTokens }> {
    const user = await User.query()
      .where('tenant_id', tenantId)
      .where('email', email.trim().toLowerCase())
      .whereNull('deleted_at')
      .first()

    if (!user) {
      throw new UnauthorizedException('Invalid credentials')
    }

    const validPassword = await hash.verify(user.password, password)
    if (!validPassword) {
      throw new UnauthorizedException('Invalid credentials')
    }

    if (user.status !== 'active') {
      throw new UnauthorizedException('Account is not active')
    }

    user.lastLoginAt = DateTime.now()
    await user.save()

    const { roles, permissions } = await this.rbacService.getUserRolesAndPermissions(user.id)
    const tokens = await this.issueTokens(user, roles, permissions, undefined, meta)

    await this.auditService.log(
      'login',
      'user',
      user.id,
      null,
      { email: user.email, roles },
      {
        userId: user.id,
        userEmail: user.email,
        ipAddress: meta?.ipAddress,
        requestId: meta?.requestId,
      }
    )

    return {
      user: this.toAuthUser(user, roles, permissions),
      tokens,
    }
  }

  async refresh(
    refreshToken: string,
    meta?: { userAgent?: string; ipAddress?: string }
  ): Promise<AuthTokens> {
    const tokenHash = this.jwtService.hashRefreshToken(refreshToken)

    const stored = await RefreshToken.query()
      .where('token_hash', tokenHash)
      .whereNull('revoked_at')
      .where('expires_at', '>', DateTime.now().toSQL())
      .preload('user')
      .first()

    if (!stored) {
      throw new UnauthorizedException('Invalid refresh token')
    }

    stored.revokedAt = DateTime.now()
    await stored.save()

    const user = stored.user
    const { roles, permissions } = await this.rbacService.getUserRolesAndPermissions(user.id)

    return this.issueTokens(user, roles, permissions, undefined, meta)
  }

  async logout(refreshToken: string, meta?: { userId?: string; userEmail?: string; ipAddress?: string; requestId?: string }): Promise<void> {
    const tokenHash = this.jwtService.hashRefreshToken(refreshToken)
    const stored = await RefreshToken.query()
      .where('token_hash', tokenHash)
      .first()

    await RefreshToken.query()
      .where('token_hash', tokenHash)
      .whereNull('revoked_at')
      .update({ revoked_at: DateTime.now().toSQL() })

    if (stored && meta?.userId) {
      await this.auditService.log(
        'logout',
        'user',
        meta.userId,
        null,
        null,
        {
          userId: meta.userId,
          userEmail: meta.userEmail,
          ipAddress: meta?.ipAddress,
          requestId: meta?.requestId,
        }
      )
    }
  }

  async getUserById(userId: string, tenantId: string): Promise<User> {
    return User.query()
      .where('id', userId)
      .where('tenant_id', tenantId)
      .whereNull('deleted_at')
      .firstOrFail()
  }

  private async issueTokens(
    user: User,
    roles: string[],
    permissions: string[],
    trx?: TransactionClientContract,
    meta?: { userAgent?: string; ipAddress?: string }
  ): Promise<AuthTokens> {
    const accessToken = await this.jwtService.signAccessToken({
      sub: user.id,
      tenantId: user.tenantId,
      email: user.email,
      roles,
      permissions,
    })

    const refreshToken = this.jwtService.generateRefreshToken()
    const refreshDays = env.get('JWT_REFRESH_EXPIRES_DAYS', 7)

    await RefreshToken.create(
      {
        userId: user.id,
        tokenHash: this.jwtService.hashRefreshToken(refreshToken),
        expiresAt: DateTime.now().plus({ days: refreshDays }),
        userAgent: meta?.userAgent ?? null,
        ipAddress: meta?.ipAddress ?? null,
      },
      trx ? { client: trx } : undefined
    )

    return {
      accessToken,
      refreshToken,
      expiresIn: env.get('JWT_ACCESS_EXPIRES_IN', '15m'),
    }
  }

  private toAuthUser(user: User, roles: string[], permissions: string[]): AuthUserPayload {
    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      tenantId: user.tenantId,
      roles,
      permissions,
    }
  }
}
