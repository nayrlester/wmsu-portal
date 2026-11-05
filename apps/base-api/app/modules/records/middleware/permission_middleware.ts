import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import { rbacService } from '#modules/records/services/rbac_service'

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

    for (const permission of permissions) {
      if (granted.has(permission)) continue
      return ctx.response.forbidden({ error: 'Insufficient permissions', required: permission })
    }

    return next()
  }
}
