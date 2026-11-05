import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import { decodeProtectedHeader } from 'jose'
import JwtService, { type JwtAccessPayload } from '#modules/library/services/auth/jwt_service'
import AuthService from '#modules/library/services/auth/auth_service'
import UnauthorizedException from '#modules/library/exceptions/unauthorized_exception'
import { tenantContext } from '#modules/library/services/tenant/tenant_context'
import {
  getAuthMode,
  verifyPlatformAccessToken,
} from '#modules/library/services/platform/platform_identity'
import PlatformUserLinkService from '#modules/library/services/platform/platform_user_link_service'

function isLikelyPlatformRs256Token(token: string): boolean {
  try {
    return decodeProtectedHeader(token).alg === 'RS256'
  } catch {
    return false
  }
}

export default class JwtAuthMiddleware {
  private jwtService = new JwtService()
  private authService = new AuthService()
  private platformLinks = new PlatformUserLinkService()

  async handle(ctx: HttpContext, next: NextFn) {
    const header = ctx.request.header('authorization')
    if (!header?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing bearer token')
    }

    const token = header.slice(7)
    const mode = getAuthMode()

    if (mode === 'platform' || mode === 'dual') {
      try {
        const claims = await verifyPlatformAccessToken(token)
        try {
          const user = await this.platformLinks.resolveLocalUser(claims)

          const resolvedTenant = tenantContext.tryGet()
          if (resolvedTenant && resolvedTenant.id !== user.tenantId) {
            throw new UnauthorizedException('Token tenant mismatch')
          }

          ctx.authUser = {
            id: user.id,
            email: user.email,
            fullName: user.fullName,
            tenantId: user.tenantId,
            roles: user.roles,
            permissions: user.permissions,
          }
          ctx.platformClaims = claims
          await next()
          return
        } catch (linkError) {
          // Valid Identity JWT but local link/provision failed — do not fall through to local JWT.
          throw new UnauthorizedException(
            linkError instanceof Error ? linkError.message : 'Platform user link failed'
          )
        }
      } catch (error) {
        if (error instanceof UnauthorizedException) {
          throw error
        }
        // Identity SSO tokens are RS256. Do not fall through to local HS256 verify —
        // that only yields a misleading "Invalid or expired token".
        if (mode === 'platform' || isLikelyPlatformRs256Token(token)) {
          throw new UnauthorizedException(
            error instanceof Error ? error.message : 'Invalid or expired platform token'
          )
        }
        // dual + non-RS256: try local Library JWT
      }
    }

    let payload: JwtAccessPayload
    try {
      payload = await this.jwtService.verifyAccessToken(token)
    } catch {
      throw new UnauthorizedException('Invalid or expired token')
    }

    const resolvedTenant = tenantContext.tryGet()
    if (resolvedTenant && resolvedTenant.id !== payload.tenantId) {
      throw new UnauthorizedException('Token tenant mismatch')
    }

    const user = await this.authService.getUserById(payload.sub, payload.tenantId)

    ctx.authUser = {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      tenantId: user.tenantId,
      roles: payload.roles,
      permissions: payload.permissions,
    }

    await next()
  }
}

export interface AuthContextUser {
  id: string
  email: string
  fullName: string
  tenantId: string
  roles: string[]
  permissions: string[]
}

declare module '@adonisjs/core/http' {
  interface HttpContext {
    authUser?: AuthContextUser
    platformClaims?: import('#modules/library/services/platform/platform_identity').PlatformAccessClaims
  }
}
