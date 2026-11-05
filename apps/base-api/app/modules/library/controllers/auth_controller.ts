import type { HttpContext } from '@adonisjs/core/http'
import AuthService from '#modules/library/services/auth/auth_service'
import TenantResolverService from '#modules/library/services/tenant/tenant_resolver_service'
import { tenantContext, toTenantContext } from '#modules/library/services/tenant/tenant_context'
import { loginValidator, refreshValidator } from '#modules/library/validators/auth'
import {
  getAuthMode,
  PlatformIdentityClient,
} from '#modules/library/services/platform/platform_identity'
import { resolveTenantSlug } from '#modules/library/services/deployment/deployment_mode'

export default class AuthController {
  private authService = new AuthService()
  private tenantResolver = new TenantResolverService()
  private platformIdentity = new PlatformIdentityClient()

  async login({ request, response, requestId }: HttpContext) {
    const payload = await request.validateUsing(loginValidator)
    const mode = getAuthMode()

    if (mode === 'platform' || mode === 'dual') {
      try {
        const result = await this.platformIdentity.login(payload.email, payload.password)
        if (result.mfaRequired) {
          return response.ok({
            success: true,
            message: 'MFA required',
            data: {
              mfaRequired: true,
              mfaChallengeToken: result.mfaChallengeToken,
            },
          })
        }

        return response.ok({
          success: true,
          message: 'Login successful',
          data: {
            tokens: {
              accessToken: result.tokens!.accessToken,
              refreshToken: result.tokens!.refreshToken,
              expiresIn: String(result.tokens!.expiresIn),
            },
          },
        })
      } catch (error) {
        if (mode === 'platform') {
          return response.unauthorized({
            success: false,
            message: error instanceof Error ? error.message : 'Platform login failed',
            code: 'PLATFORM_LOGIN_FAILED',
          })
        }
      }
    }

    const slug = resolveTenantSlug(payload.tenantSlug ?? request.header('x-tenant-slug'))

    if (!slug) {
      return response.badRequest({
        success: false,
        message: 'Tenant slug is required',
        code: 'TENANT_REQUIRED',
      })
    }

    const tenant = await this.tenantResolver.resolve({ slug })

    const result = await tenantContext.run(toTenantContext(tenant), () =>
      this.authService.login(tenant.id, payload.email, payload.password, {
        userAgent: request.header('user-agent'),
        ipAddress: request.ip(),
        requestId,
      })
    )

    return response.ok({
      success: true,
      message: 'Login successful',
      data: result,
    })
  }

  async refresh({ request, response }: HttpContext) {
    const { refreshToken } = await request.validateUsing(refreshValidator)
    const mode = getAuthMode()

    if (mode === 'platform' || mode === 'dual') {
      try {
        const result = await this.platformIdentity.refresh(refreshToken)
        return response.ok({
          success: true,
          message: 'Token refreshed',
          data: {
            tokens: {
              accessToken: result.tokens.accessToken,
              refreshToken: result.tokens.refreshToken,
              expiresIn: String(result.tokens.expiresIn),
            },
          },
        })
      } catch (error) {
        if (mode === 'platform') {
          return response.unauthorized({
            success: false,
            message: error instanceof Error ? error.message : 'Platform refresh failed',
          })
        }
      }
    }

    const tokens = await this.authService.refresh(refreshToken, {
      userAgent: request.header('user-agent'),
      ipAddress: request.ip(),
    })

    return response.ok({
      success: true,
      message: 'Token refreshed',
      data: { tokens },
    })
  }

  async logout({ request, response, authUser, requestId }: HttpContext) {
    const refreshToken = request.input('refreshToken')
    const mode = getAuthMode()
    const bearer = request.header('authorization')

    if ((mode === 'platform' || mode === 'dual') && bearer?.startsWith('Bearer ')) {
      try {
        await this.platformIdentity.logout(bearer.slice(7), refreshToken)
        return response.ok({
          success: true,
          message: 'Logged out successfully',
          data: null,
        })
      } catch {
        if (mode === 'platform') {
          return response.ok({
            success: true,
            message: 'Logged out successfully',
            data: null,
          })
        }
      }
    }

    if (refreshToken) {
      await this.authService.logout(refreshToken, {
        userId: authUser?.id,
        userEmail: authUser?.email,
        ipAddress: request.ip(),
        requestId,
      })
    }

    return response.ok({
      success: true,
      message: 'Logged out successfully',
      data: null,
    })
  }

  async me({ response, authUser }: HttpContext) {
    return response.ok({
      success: true,
      data: { user: authUser },
    })
  }
}
