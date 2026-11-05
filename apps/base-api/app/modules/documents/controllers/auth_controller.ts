import type { HttpContext } from '@adonisjs/core/http'
import {
  loginValidator,
  registerValidator,
  refreshValidator,
  forgotPasswordValidator,
  resetPasswordValidator,
  verifyEmailValidator,
  resendVerificationValidator,
  mfaChallengeValidator,
} from '#modules/documents/validators/auth'
import { authService } from '#modules/documents/services/auth_service'
import { passwordResetService } from '#modules/documents/services/password_reset_service'
import { emailVerificationService } from '#modules/documents/services/email_verification_service'
import { rbacService } from '#modules/documents/services/rbac_service'
import {
  getAuthMode,
  PlatformIdentityClient,
  verifyPlatformAccessToken,
} from '#modules/documents/services/platform/platform_identity'
import PlatformUserLinkService from '#modules/documents/services/platform/platform_user_link_service'

function serializeUser(user: {
  id: string
  email: string
  fullName: string | null
  tenantId: string | null
  isSuperAdmin: boolean
  emailVerified: boolean
  mfaEnabled: boolean
}) {
  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    tenantId: user.tenantId,
    isSuperAdmin: user.isSuperAdmin,
    emailVerified: user.emailVerified,
    mfaEnabled: user.mfaEnabled,
  }
}

function serializePlatformTokens(tokens: {
  accessToken: string
  refreshToken: string
  expiresIn: number
  tokenType?: string
}) {
  return {
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    expiresIn: tokens.expiresIn,
    tokenType: 'Bearer' as const,
  }
}

export default class AuthController {
  private platformIdentity = new PlatformIdentityClient()
  private platformLinks = new PlatformUserLinkService()

  async register({ request, response }: HttpContext) {
    const payload = await request.validateUsing(registerValidator)
    const result = await authService.register(payload)

    return response.created({
      user: serializeUser(result.user),
      tenant: {
        id: result.tenant.id,
        name: result.tenant.name,
        slug: result.tenant.slug,
      },
      tokens: result.tokens,
      message: 'Registration successful. Please verify your email.',
    })
  }

  async login({ request, response }: HttpContext) {
    const payload = await request.validateUsing(loginValidator)
    const mode = getAuthMode()

    if (mode === 'platform' || mode === 'dual') {
      try {
        const result = await this.platformIdentity.login(payload.email, payload.password)

        if (result.mfaRequired) {
          return response.ok({
            mfaRequired: true,
            mfaChallengeToken: result.mfaChallengeToken,
            message: 'MFA verification required',
          })
        }

        const tokens = result.tokens!
        const claims = await verifyPlatformAccessToken(tokens.accessToken)
        const user = await this.platformLinks.resolveLocalUser(claims)

        return response.ok({
          user: serializeUser(user),
          tokens: serializePlatformTokens(tokens),
        })
      } catch (error) {
        if (mode === 'platform') {
          return response.unauthorized({
            error: error instanceof Error ? error.message : 'Platform login failed',
          })
        }
      }
    }

    const meta = { ip: request.ip(), userAgent: request.header('user-agent') }
    const result = await authService.login(payload.email, payload.password, payload.mfaCode, meta)

    if (result.mfaRequired) {
      return response.ok({
        mfaRequired: true,
        mfaChallengeToken: result.mfaChallengeToken,
        message: 'MFA verification required',
      })
    }

    return response.ok({
      user: serializeUser(result.user),
      tokens: result.tokens,
    })
  }

  async mfaChallenge({ request, response }: HttpContext) {
    const payload = await request.validateUsing(mfaChallengeValidator)
    const meta = { ip: request.ip(), userAgent: request.header('user-agent') }
    const result = await authService.completeMfaChallenge(
      payload.mfaChallengeToken,
      payload.mfaCode,
      meta
    )

    return response.ok({
      user: serializeUser(result.user),
      tokens: result.tokens,
    })
  }

  async refresh({ request, response }: HttpContext) {
    const { refreshToken } = await request.validateUsing(refreshValidator)
    const mode = getAuthMode()

    if (mode === 'platform' || mode === 'dual') {
      try {
        const result = await this.platformIdentity.refresh(refreshToken)
        return response.ok({ tokens: serializePlatformTokens(result.tokens) })
      } catch (error) {
        if (mode === 'platform') {
          return response.unauthorized({
            error: error instanceof Error ? error.message : 'Platform refresh failed',
          })
        }
      }
    }

    const meta = { ip: request.ip(), userAgent: request.header('user-agent') }
    const tokens = await authService.refresh(refreshToken, meta)
    return response.ok({ tokens })
  }

  async logout({ auth, request, response }: HttpContext) {
    const refreshToken = request.input('refreshToken')
    const sessionId = request.input('sessionId')
    const meta = { ip: request.ip(), userAgent: request.header('user-agent') }
    const mode = getAuthMode()
    const bearer = request.header('authorization')

    if ((mode === 'platform' || mode === 'dual') && bearer?.startsWith('Bearer ')) {
      try {
        await verifyPlatformAccessToken(bearer.slice(7))
        await this.platformIdentity.logout(bearer.slice(7), refreshToken)
        return response.ok({ message: 'Logged out successfully' })
      } catch {
        if (mode === 'platform') {
          return response.ok({ message: 'Logged out successfully' })
        }
      }
    }

    const user = auth.user!
    await authService.logout(user, refreshToken, sessionId, meta)

    try {
      await auth.use('api').invalidateToken()
    } catch {
      // Platform handoff tokens are not stored in auth_access_tokens.
    }

    return response.ok({ message: 'Logged out successfully' })
  }

  async profile({ auth, response, platformClaims, platformPermissions }: HttpContext) {
    const authUser = auth.user!
    const user = authUser as unknown as import('#modules/documents/models/user').default
    await user.load('roles', (roleQuery) => {
      if (user.tenantId) {
        roleQuery.wherePivot('tenant_id', user.tenantId)
      }
      roleQuery.preload('permissions')
    })

    const tenantId = user.tenantId ?? ''
    const effective = await rbacService.getEffectivePermissions(
      user,
      tenantId,
      platformPermissions
    )

    return response.ok({
      ...serializeUser(user),
      avatarUrl: user.avatarUrl,
      roles: user.roles.map((r) => ({
        id: r.id,
        name: r.name,
        slug: r.slug,
        permissions: r.permissions.map((p) => p.slug),
      })),
      ...(platformClaims
        ? {
            platformRoles: platformClaims.roles,
            platformPermissions: effective,
          }
        : {}),
      permissions: effective,
    })
  }

  async forgotPassword({ request, response }: HttpContext) {
    const { email } = await request.validateUsing(forgotPasswordValidator)
    await passwordResetService.requestReset(email)

    return response.ok({
      message: 'If an account exists with that email, a reset link has been sent.',
    })
  }

  async resetPassword({ request, response }: HttpContext) {
    const payload = await request.validateUsing(resetPasswordValidator)
    await passwordResetService.resetPassword(payload.token, payload.password)

    return response.ok({ message: 'Password reset successfully. Please log in.' })
  }

  async validateResetToken({ request, response }: HttpContext) {
    const token = request.input('token')
    if (!token) {
      return response.badRequest({ error: 'Token is required' })
    }

    const valid = await passwordResetService.validateToken(token)
    return response.ok({ valid })
  }

  async verifyEmail({ request, response }: HttpContext) {
    const { token } = await request.validateUsing(verifyEmailValidator)
    const user = await emailVerificationService.verify(token)

    return response.ok({ message: 'Email verified successfully', user: serializeUser(user) })
  }

  async resendVerification({ request, response }: HttpContext) {
    const { email } = await request.validateUsing(resendVerificationValidator)
    await emailVerificationService.resend(email)

    return response.ok({
      message: 'If an unverified account exists, a verification email has been sent.',
    })
  }
}
