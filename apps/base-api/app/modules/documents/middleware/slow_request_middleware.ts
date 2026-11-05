import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import logger from '@adonisjs/core/services/logger'
import env from '#start/env'

const DEFAULT_SLOW_MS = 500

export default class SlowRequestMiddleware {
  async handle(ctx: HttpContext, next: NextFn) {
    const threshold = Number(env.get('SLOW_REQUEST_MS') ?? DEFAULT_SLOW_MS)
    const start = process.hrtime.bigint()
    await next()
    const elapsedMs = Number(process.hrtime.bigint() - start) / 1e6

    if (elapsedMs >= threshold) {
      logger.warn(
        {
          method: ctx.request.method(),
          route: ctx.route?.pattern ?? ctx.request.url(),
          status: ctx.response.getStatus(),
          durationMs: Math.round(elapsedMs),
          tenantId: ctx.request.header('x-tenant-id'),
        },
        '[SlowRequest] request exceeded threshold'
      )
    }
  }
}
