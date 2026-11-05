import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import { DefaultRoleSlug } from '#modules/documents/domain/enums/index'

const ADMIN_SLUGS = new Set<string>([
  DefaultRoleSlug.TENANT_OWNER,
  DefaultRoleSlug.ADMIN,
  DefaultRoleSlug.SUPER_ADMIN,
])

/**
 * Restricts to platform Super Admin or tenant Admin / Tenant Owner.
 */
export default class TenantAdminMiddleware {
  async handle(ctx: HttpContext, next: NextFn) {
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

    await user.load('roles', (query) => {
      query.wherePivot('tenant_id', tenantId)
    })

    const allowed = user.roles.some((role) => ADMIN_SLUGS.has(role.slug))
    if (!allowed) {
      return ctx.response.forbidden({
        error: 'Admin or tenant owner access required',
      })
    }

    return next()
  }
}
