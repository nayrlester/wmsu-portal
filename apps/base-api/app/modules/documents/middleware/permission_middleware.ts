import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import { rbacService } from '#modules/documents/services/rbac_service'

export default class PermissionMiddleware {
  async handle(ctx: HttpContext, next: NextFn, permissions: string[]) {
    const user = ctx.auth.user
    if (!user) {
      return ctx.response.unauthorized({ error: 'Authentication required' })
    }

    if (user.isSuperAdmin) {
      return next()
    }

    const tenantId = ctx.tenant?.id ?? user.tenantId
    if (!tenantId) {
      return ctx.response.forbidden({ error: 'Tenant context required' })
    }

    const granted = new Set(
      await rbacService.getEffectivePermissions(user, tenantId, ctx.platformPermissions)
    )

    for (const permission of permissions) {
      if (granted.has('*') || granted.has(permission)) {
        continue
      }
      return ctx.response.forbidden({
        error: 'Insufficient permissions',
        required: permission,
      })
    }

    return next()
  }
}
