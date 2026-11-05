import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'

/** Prevent CDN/proxy caching of authenticated JSON responses. */
export default class NoStoreCacheMiddleware {
  async handle(ctx: HttpContext, next: NextFn) {
    const result = await next()
    ctx.response.header('Cache-Control', 'private, no-store, max-age=0, must-revalidate')
    ctx.response.header('Pragma', 'no-cache')
    return result
  }
}
