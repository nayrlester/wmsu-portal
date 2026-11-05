import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import { rbacService } from '#modules/enrollment/services/rbac_service'

export default class PermissionMiddleware {
  async handle(ctx: HttpContext, next: NextFn, permissions: string[]) {
    const user = ctx.auth.user ?? ctx.platformUser
    if (!user) {
      return ctx.response.unauthorized({ error: 'Authentication required' })
    }

    const granted = new Set(
      await rbacService.getEffectivePermissions(user, ctx.platformPermissions)
    )

    if (granted.has('*') || user.isAdmin) {
      return next()
    }

    if (!permissions.length) {
      return next()
    }

    const allowed = permissions.some((permission) => granted.has(permission))
    if (allowed) {
      return next()
    }

    return ctx.response.forbidden({
      error: 'Insufficient permissions',
      requiredAnyOf: permissions,
    })
  }
}
