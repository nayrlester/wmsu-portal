import { DateTime } from 'luxon'
import crypto from 'node:crypto'
import { errors } from '@adonisjs/auth'
import User from '#modules/documents/models/user'
import Tenant from '#modules/documents/models/tenant'
import RefreshToken from '#modules/documents/models/refresh_token'
import UserSession from '#modules/documents/models/user_session'
import { auditService } from '#modules/documents/services/audit_service'
import { emailVerificationService } from '#modules/documents/services/email_verification_service'
import { sessionService } from '#modules/documents/services/session_service'
import { mfaService } from '#modules/documents/services/mfa_service'
import { tokenService } from '#modules/documents/services/token_service'
import { tenantOnboardingService } from '#modules/documents/services/tenant_onboarding_service'
import { AuditAction } from '#modules/documents/domain/enums/index'

export interface AuthTokens {
  accessToken: string
  refreshToken: string
  expiresIn: number
  tokenType: 'Bearer'
}

export interface LoginResult {
  user: User
  tokens?: AuthTokens
  mfaRequired?: boolean
  mfaChallengeToken?: string
}

export interface SessionMeta {
  ip?: string
  userAgent?: string
  deviceLabel?: string
}

export class AuthService {
  async register(payload: {
    email: string
    password: string
    fullName: string
    organizationName: string
  }): Promise<{ user: User; tenant: Tenant; tokens: AuthTokens }> {
    const onboarded = await tenantOnboardingService.onboardOrganization({
      name: payload.organizationName,
      owner: {
        email: payload.email,
        password: payload.password,
        fullName: payload.fullName,
      },
    })

    const user = onboarded.owner!
    const tenant = onboarded.tenant

    const tokens = await this.issueTokensForUser(user)
    await emailVerificationService.sendVerification(user)

    await auditService.log({
      tenantId: tenant.id,
      userId: user.id,
      action: AuditAction.CREATE,
      entityType: 'user',
      entityId: user.id,
      newValues: { email: user.email },
    })

    return { user, tenant, tokens }
  }

  async login(
    email: string,
    password: string,
    mfaCode?: string,
    meta?: SessionMeta
  ): Promise<LoginResult> {
    try {
      const user = await User.verifyCredentials(email.toLowerCase(), password)

      if (user.status !== 'active') {
        throw new errors.E_INVALID_CREDENTIALS('Account is not active')
      }

      if (user.mfaEnabled) {
        if (!mfaCode) {
          return {
            user,
            mfaRequired: true,
            mfaChallengeToken: mfaService.createMfaChallengeToken(user.id),
          }
        }

        if (!mfaService.verifyCode(user, mfaCode)) {
          throw new errors.E_INVALID_CREDENTIALS('Invalid MFA code')
        }
      }

      user.lastLoginAt = DateTime.now()
      user.lastLoginIp = meta?.ip ?? null
      await user.save()

      const tokens = await this.issueTokensForUser(user, meta)

      await auditService.log({
        tenantId: user.tenantId,
        userId: user.id,
        action: AuditAction.LOGIN,
        entityType: 'user',
        entityId: user.id,
        ipAddress: meta?.ip,
        userAgent: meta?.userAgent,
      })

      return { user, tokens }
    } catch (error) {
      if (error instanceof errors.E_INVALID_CREDENTIALS) {
        throw error
      }
      throw new errors.E_INVALID_CREDENTIALS('Invalid credentials')
    }
  }

  async completeMfaChallenge(
    mfaChallengeToken: string,
    mfaCode: string,
    meta?: SessionMeta
  ): Promise<{ user: User; tokens: AuthTokens }> {
    const userId = mfaService.parseMfaChallengeToken(mfaChallengeToken)
    if (!userId) {
      throw new Error('Invalid or expired MFA challenge')
    }

    const user = await User.findOrFail(userId)
    if (!user.mfaEnabled || !mfaService.verifyCode(user, mfaCode)) {
      throw new errors.E_INVALID_CREDENTIALS('Invalid MFA code')
    }

    user.lastLoginAt = DateTime.now()
    user.lastLoginIp = meta?.ip ?? null
    await user.save()

    const tokens = await this.issueTokensForUser(user, meta)

    await auditService.log({
      tenantId: user.tenantId,
      userId: user.id,
      action: AuditAction.LOGIN,
      entityType: 'user',
      entityId: user.id,
      metadata: { mfa: true },
      ipAddress: meta?.ip,
      userAgent: meta?.userAgent,
    })

    return { user, tokens }
  }

  async refresh(refreshToken: string, meta?: SessionMeta): Promise<AuthTokens> {
    const tokenHash = tokenService.hash(refreshToken)
    const stored = await RefreshToken.query()
      .where('token_hash', tokenHash)
      .whereNull('revoked_at')
      .where('expires_at', '>', DateTime.now().toSQL())
      .firstOrFail()

    const user = await User.findOrFail(stored.userId)

    if (stored.id) {
      await sessionService.touchSession(stored.id)
    }

    stored.revokedAt = DateTime.now()
    await stored.save()

    await UserSession.query()
      .where('refresh_token_id', stored.id)
      .whereNull('revoked_at')
      .update({ revoked_at: DateTime.now().toSQL() })

    return this.issueTokensForUser(user, meta)
  }

  async logout(
    user: User,
    refreshToken?: string,
    currentSessionId?: string,
    meta?: SessionMeta
  ): Promise<void> {
    if (refreshToken) {
      const tokenHash = tokenService.hash(refreshToken)
      const stored = await RefreshToken.query()
        .where('user_id', user.id)
        .where('token_hash', tokenHash)
        .first()

      if (stored) {
        stored.revokedAt = DateTime.now()
        await stored.save()
      }
    }

    if (currentSessionId) {
      await sessionService.revokeSession(currentSessionId, user.id)
    }

    await auditService.log({
      tenantId: user.tenantId,
      userId: user.id,
      action: AuditAction.LOGOUT,
      entityType: 'user',
      entityId: user.id,
      ipAddress: meta?.ip,
      userAgent: meta?.userAgent,
    })
  }

  async issueTokensForUser(user: User, meta?: SessionMeta): Promise<AuthTokens> {
    const accessToken = await User.accessTokens.create(user, ['*'], {
      expiresIn: '15 mins',
    })

    const refreshTokenValue = tokenService.generate(48)
    const expiresAt = DateTime.now().plus({ days: 7 })

    const refreshRecord = await RefreshToken.create({
      userId: user.id,
      tokenHash: tokenService.hash(refreshTokenValue),
      userAgent: meta?.userAgent ?? null,
      ipAddress: meta?.ip ?? null,
      deviceLabel: meta?.deviceLabel ?? null,
      expiresAt,
      lastActiveAt: DateTime.now(),
    })

    await sessionService.createSession(user, refreshRecord.id, expiresAt, meta)

    return {
      accessToken: accessToken.value!.release(),
      refreshToken: refreshTokenValue,
      expiresIn: 900,
      tokenType: 'Bearer',
    }
  }
}

export const authService = new AuthService()
