import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'

export default class RequestLoggingMiddleware {
  async handle(ctx: HttpContext, next: NextFn) {
    const start = Date.now()
    await next()
    const durationMs = Date.now() - start

    ctx.logger.info(
      {
        requestId: ctx.requestId,
        method: ctx.request.method(),
        url: ctx.request.url(),
        status: ctx.response.getStatus(),
        durationMs,
        userId: ctx.authUser?.id,
        ip: ctx.request.ip(),
      },
      'HTTP request'
    )
  }
}
