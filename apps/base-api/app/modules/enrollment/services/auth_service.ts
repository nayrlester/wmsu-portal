import { DateTime } from 'luxon'
import { errors } from '@adonisjs/auth'
import User from '#modules/enrollment/models/user'
import RefreshToken from '#modules/enrollment/models/refresh_token'
import { tokenService } from '#modules/enrollment/services/token_service'
import { auditLogService } from '#modules/enrollment/services/audit_log_service'
import { AuditAction } from '#modules/enrollment/domain/enums/index'

export interface AuthTokens {
  accessToken: string
  refreshToken: string
  expiresIn: number
  tokenType: 'Bearer'
}

export class AuthService {
  async login(email: string, password: string): Promise<{ user: User; tokens: AuthTokens }> {
    try {
      const user = await User.verifyCredentials(email.toLowerCase(), password)

      if (user.status !== 'active') {
        throw new errors.E_INVALID_CREDENTIALS('Account is not active')
      }

      const tokens = await this.issueTokensForUser(user)

      await auditLogService.log({
        organizationId: user.organizationId,
        actorUserId: user.id,
        action: AuditAction.LOGIN,
        entityType: 'user',
        entityId: user.id,
      })

      return { user, tokens }
    } catch (error) {
      if (error instanceof errors.E_INVALID_CREDENTIALS) {
        throw error
      }
      throw new errors.E_INVALID_CREDENTIALS('Invalid credentials')
    }
  }

  async refresh(refreshToken: string): Promise<AuthTokens> {
    const tokenHash = tokenService.hash(refreshToken)
    const stored = await RefreshToken.query()
      .where('token_hash', tokenHash)
      .whereNull('revoked_at')
      .where('expires_at', '>', DateTime.now().toSQL())
      .firstOrFail()

    const user = await User.findOrFail(stored.userId)

    stored.revokedAt = DateTime.now()
    await stored.save()

    return this.issueTokensForUser(user)
  }

  async logout(user: User, refreshToken?: string): Promise<void> {
    if (refreshToken) {
      const tokenHash = tokenService.hash(refreshToken)
      await RefreshToken.query()
        .where('user_id', user.id)
        .where('token_hash', tokenHash)
        .update({ revoked_at: DateTime.now().toSQL() })
    }

    await auditLogService.log({
      organizationId: user.organizationId,
      actorUserId: user.id,
      action: AuditAction.LOGOUT,
      entityType: 'user',
      entityId: user.id,
    })
  }

  async issueTokensForUser(user: User): Promise<AuthTokens> {
    const accessToken = await User.accessTokens.create(user, ['*'], {
      expiresIn: '15 mins',
    })

    const refreshTokenValue = tokenService.generate(48)
    const expiresAt = DateTime.now().plus({ days: 7 })

    await RefreshToken.create({
      userId: user.id,
      tokenHash: tokenService.hash(refreshTokenValue),
      expiresAt,
    })

    return {
      accessToken: accessToken.value!.release(),
      refreshToken: refreshTokenValue,
      expiresIn: 900,
      tokenType: 'Bearer',
    }
  }
}

export const authService = new AuthService()
