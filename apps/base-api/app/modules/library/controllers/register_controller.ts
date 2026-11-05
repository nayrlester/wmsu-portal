import type { HttpContext } from '@adonisjs/core/http'
import AuthService from '#modules/library/services/auth/auth_service'
import { registerValidator } from '#modules/library/validators/auth'
import { allowPublicRegister } from '#modules/library/services/deployment/deployment_mode'

export default class RegisterController {
  private authService = new AuthService()

  async store({ request, response }: HttpContext) {
    if (!allowPublicRegister()) {
      return response.forbidden({
        success: false,
        message:
          'Public organization registration is disabled. This system runs as a single-institution university library (ULMIS), not a SaaS marketplace.',
        code: 'REGISTRATION_DISABLED',
      })
    }

    const payload = await request.validateUsing(registerValidator)

    try {
      const result = await this.authService.registerTenant(payload)

      return response.created({
        success: true,
        message: 'Organization registered successfully',
        data: {
          tenant: {
            id: result.tenant.id,
            slug: result.tenant.slug,
            name: result.tenant.name,
            type: result.tenant.type,
          },
          user: result.user,
          tokens: result.tokens,
        },
      })
    } catch (error) {
      if (error instanceof Error && error.message === 'Tenant slug already exists') {
        return response.conflict({
          success: false,
          message: error.message,
          code: 'TENANT_SLUG_EXISTS',
        })
      }
      throw error
    }
  }
}
