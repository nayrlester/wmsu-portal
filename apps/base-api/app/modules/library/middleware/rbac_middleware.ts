import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import ForbiddenException from '#modules/library/exceptions/forbidden_exception'
import RbacService from '#modules/library/services/auth/rbac_service'

export default class RbacMiddleware {
  constructor(private permission: string) {}

  private rbacService = new RbacService()

  async handle(ctx: HttpContext, next: NextFn) {
    const user = ctx.authUser
    if (!user) {
      throw new ForbiddenException('Authentication required')
    }

    if (!this.rbacService.hasPermission(user.permissions, this.permission)) {
      throw new ForbiddenException(`Missing permission: ${this.permission}`)
    }

    await next()
  }
}

export function requirePermission(permission: string) {
  return () => import('#modules/library/middleware/rbac_middleware').then((m) => {
    return new m.default(permission)
  })
}
