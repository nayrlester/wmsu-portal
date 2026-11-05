import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import type { Authenticators } from '@adonisjs/auth/types'
import { errors } from '@adonisjs/auth'
import { Secret } from '@adonisjs/core/helpers'
import User from '#modules/records/models/user'
import Organization from '#modules/records/models/organization'
import {
  getAuthMode,
  verifyPlatformAccessToken,
  type PlatformAccessClaims,
} from '#modules/records/services/platform/platform_identity'
import PlatformUserLinkService from '#modules/records/services/platform/platform_user_link_service'

function platformAuthFailure(message: string) {
  return new errors.E_UNAUTHORIZED_ACCESS(message, { guardDriverName: 'api' })
}

function looksLikeJwt(token: string): boolean {
  const parts = token.split('.')
  return parts.length === 3 && parts.every((p) => p.length > 0)
}

function applyPlatformUser(
  ctx: HttpContext,
  user: User,
  claims: PlatformAccessClaims,
  permissions: string[]
): void {
  const guard = ctx.auth.use('api')

  guard.authenticationAttempted = true
  guard.isAuthenticated = true
  ;(guard as { user: User | null }).user = user

  ctx.platformUser = user
  ctx.platformClaims = claims
  ctx.platformPermissions = permissions

  Object.defineProperty(ctx.auth, 'user', {
    configurable: true,
    enumerable: true,
    get: () => (ctx.auth.use('api') as { user: User | null }).user ?? ctx.platformUser ?? null,
  })
}

function applyLocalUser(ctx: HttpContext, user: User): void {
  const guard = ctx.auth.use('api')

  guard.authenticationAttempted = true
  guard.isAuthenticated = true
  ;(guard as { user: User | null }).user = user

  Object.defineProperty(ctx.auth, 'user', {
    configurable: true,
    enumerable: true,
    get: () => (ctx.auth.use('api') as { user: User | null }).user ?? user,
  })
}

export default class AuthMiddleware {
  private platformLinks = new PlatformUserLinkService()

  async handle(
    ctx: HttpContext,
    next: NextFn,
    options: { guards?: (keyof Authenticators)[] } = {}
  ) {
    const mode = getAuthMode()
    const header = ctx.request.header('authorization')

    if (mode === 'platform' || mode === 'dual') {
      if (header?.startsWith('Bearer ')) {
        const token = header.slice(7)
        try {
          const claims = await verifyPlatformAccessToken(token)
          try {
            const user = await this.platformLinks.resolveLocalUser(claims)
            await this.assertOrgMatch(user, claims)
            const permissions = this.platformLinks.mapPermissions(
              claims.permissions,
              claims.roles
            )
            applyPlatformUser(ctx, user, claims, permissions)
            // Do not call auth.check() here — it re-validates the Bearer as a local
            // opaque token and rejects valid Identity JWTs (breaks SSO /auth/me).
            return next()
          } catch (linkError) {
            if (linkError instanceof errors.E_UNAUTHORIZED_ACCESS) throw linkError
            throw platformAuthFailure(
              linkError instanceof Error ? linkError.message : 'Platform user link failed'
            )
          }
        } catch (error) {
          if (error instanceof errors.E_UNAUTHORIZED_ACCESS) throw error
          if (mode === 'platform') {
            throw platformAuthFailure(
              error instanceof Error ? error.message : 'Invalid or expired platform token'
            )
          }
          // dual: Identity JWTs must not fall through to local opaque auth.
          if (looksLikeJwt(token)) {
            throw platformAuthFailure(
              error instanceof Error
                ? `Identity SSO token rejected: ${error.message}`
                : 'Identity SSO token rejected'
            )
          }
        }
      } else if (mode === 'platform') {
        throw platformAuthFailure('Missing bearer token')
      }
    }

    if (mode === 'local' && header?.startsWith('Bearer ') && looksLikeJwt(header.slice(7))) {
      throw platformAuthFailure(
        'Identity SSO is disabled on this API (AUTH_MODE=local). Set AUTH_MODE=dual and PLATFORM_* env vars.'
      )
    }

    if (header?.startsWith('Bearer ')) {
      const token = header.slice(7)
      if (!looksLikeJwt(token)) {
        const accessToken = await User.accessTokens.verify(new Secret(token))
        if (accessToken) {
          const user = await User.find(accessToken.tokenableId)
          if (user && user.status === 'active') {
            applyLocalUser(ctx, user)
            return next()
          }
        }
      }
    }

    await ctx.auth.authenticateUsing(options.guards)
    return next()
  }

  private async assertOrgMatch(user: User, claims: PlatformAccessClaims) {
    if (!user.organizationId) {
      throw new Error('Platform user has no TORMS organization')
    }

    const org = await Organization.find(user.organizationId)
    if (!org) {
      throw new Error('TORMS organization not found for platform user')
    }

    const appOrgId = claims.apps.records
    if (appOrgId && appOrgId !== 'linked' && appOrgId !== org.id) {
      throw new Error('Token organization mismatch')
    }

    if (org.platformOrganizationId && org.platformOrganizationId !== claims.org_id) {
      throw new Error(
        'Token organization mismatch. Clear organizations.platform_organization_id or use matching Identity org.'
      )
    }
  }
}

declare module '@adonisjs/core/http' {
  interface HttpContext {
    platformClaims?: PlatformAccessClaims
    platformPermissions?: string[]
    /** Lucid user resolved from Identity SSO (fallback when auth.user is unset). */
    platformUser?: User
  }
}
