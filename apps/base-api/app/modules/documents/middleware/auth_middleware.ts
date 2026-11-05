import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import type { Authenticators } from '@adonisjs/auth/types'
import { errors } from '@adonisjs/auth'
import User from '#modules/documents/models/user'
import Tenant from '#modules/documents/models/tenant'
import {
  getAuthMode,
  verifyPlatformAccessToken,
  type PlatformAccessClaims,
} from '#modules/documents/services/platform/platform_identity'
import PlatformUserLinkService from '#modules/documents/services/platform/platform_user_link_service'

function platformAuthFailure(message: string) {
  return new errors.E_UNAUTHORIZED_ACCESS(message, { guardDriverName: 'api' })
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

export default class AuthMiddleware {
  private platformLinks = new PlatformUserLinkService()

  async handle(
    ctx: HttpContext,
    next: NextFn,
    options: {
      guards?: (keyof Authenticators)[]
    } = {}
  ) {
    const mode = getAuthMode()

    if (mode === 'platform' || mode === 'dual') {
      const header = ctx.request.header('authorization')
      if (header?.startsWith('Bearer ')) {
        try {
          const claims = await verifyPlatformAccessToken(header.slice(7))
          try {
            const user = await this.platformLinks.resolveLocalUser(claims)
            await this.assertTenantOrgMatch(user, claims)
            const permissions = this.platformLinks.mapPermissions(claims.permissions, claims)
            applyPlatformUser(ctx, user, claims, permissions)
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
          // dual: only fall through when the bearer is not a valid Identity access token
        }
      } else if (mode === 'platform') {
        throw platformAuthFailure('Missing bearer token')
      }
    }

    await ctx.auth.authenticateUsing(options.guards)
    return next()
  }

  private async assertTenantOrgMatch(user: User, claims: PlatformAccessClaims) {
    if (!user.tenantId) {
      throw new Error('Platform user has no UDMS tenant')
    }

    const tenant = await Tenant.find(user.tenantId)
    if (!tenant) {
      throw new Error('UDMS tenant not found for platform user')
    }

    const appTenantId = claims.apps.docstrack
    if (appTenantId && appTenantId !== 'linked' && appTenantId !== tenant.id) {
      throw new Error('Token tenant mismatch')
    }

    if (tenant.platformOrganizationId && tenant.platformOrganizationId !== claims.org_id) {
      throw new Error('Token organization mismatch')
    }
  }
}

declare module '@adonisjs/core/http' {
  interface HttpContext {
    platformClaims?: PlatformAccessClaims
    platformPermissions?: string[]
    platformUser?: User
  }
}
