import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import app from '@adonisjs/core/services/app'

/**
 * Short private cache hints for authenticated GET responses.
 * Browsers/CDNs won't cache without explicit credentials policy; helps HTTP clients and proxies.
 */
export default class ApiCacheMiddleware {
  async handle(ctx: HttpContext, next: NextFn) {
    await next()

    if (!app.inProduction) return
    if (ctx.request.method() !== 'GET') return
    if (ctx.response.getStatus() !== 200) return

    const path = ctx.request.url()
    const cacheable =
      path.includes('/account/dashboard/stats') ||
      path.includes('/account/permissions/me') ||
      path.includes('/account/organization') ||
      path.includes('/public/plans')

    if (cacheable) {
      ctx.response.header('Cache-Control', 'private, max-age=30, stale-while-revalidate=60')
    }
  }
}
