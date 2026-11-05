import type { HttpContext } from '@adonisjs/core/http'
import { loginValidator, refreshValidator } from '#modules/enrollment/validators/auth'
import { authService } from '#modules/enrollment/services/auth_service'
import { rbacService } from '#modules/enrollment/services/rbac_service'
import User from '#modules/enrollment/models/user'

export default class AuthController {
  async login({ request, response }: HttpContext) {
    const { email, password } = await request.validateUsing(loginValidator)
    const { user, tokens } = await authService.login(email, password)
    const permissions = await rbacService.getUserPermissions(user)
    const hydrated = await User.query().where('id', user.id).preload('roles').first()
    return response.ok({ data: { user: hydrated ?? user, tokens, permissions } })
  }

  async refresh({ request, response }: HttpContext) {
    const { refreshToken } = await request.validateUsing(refreshValidator)
    const tokens = await authService.refresh(refreshToken)
    return response.ok({ data: { tokens } })
  }

  async logout({ auth, request, response, platformUser }: HttpContext) {
    const user = auth.user ?? platformUser
    if (!user) {
      return response.unauthorized({ error: 'Unauthorized', message: 'Unauthorized' })
    }
    const refreshToken = request.input('refreshToken')
    await authService.logout(user, refreshToken)
    return response.ok({ data: { message: 'Logged out' } })
  }

  async me(ctx: HttpContext) {
    const user = ctx.auth.user ?? ctx.platformUser
    if (!user) {
      return ctx.response.unauthorized({ error: 'Unauthorized', message: 'Unauthorized' })
    }

    const permissions = await rbacService.getEffectivePermissions(user, ctx.platformPermissions)
    const hydrated = await User.query().where('id', user.id).preload('roles').first()
    const localSlugs = (hydrated?.roles ?? []).map((r) => r.slug)
    const identityRoles = ctx.platformClaims?.roles ?? []
    const mergedRoles = [...new Set([...identityRoles, ...localSlugs])]

    const baseUser = hydrated ?? user
    const userPayload = {
      ...(typeof baseUser.serialize === 'function' ? baseUser.serialize() : baseUser),
      roles: mergedRoles.map((slug) => ({ slug, name: slug })),
    }

    return ctx.response.ok({
      data: {
        user: userPayload,
        permissions,
        identityRoles,
      },
    })
  }
}
