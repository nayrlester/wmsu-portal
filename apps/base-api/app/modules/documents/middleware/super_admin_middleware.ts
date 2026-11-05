import type { HttpContext } from '@adonisjs/core/http'

export default class SuperAdminMiddleware {
  async handle(ctx: HttpContext, next: () => Promise<void>) {
    const user = ctx.auth.user

    if (!user?.isSuperAdmin) {
      return ctx.response.forbidden({ error: 'Super admin access required' })
    }

    await next()
  }
}
