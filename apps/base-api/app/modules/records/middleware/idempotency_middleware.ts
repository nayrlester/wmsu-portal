import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'

type Entry = { status: number; body: unknown; expiresAt: number }

/**
 * Simple Idempotency-Key replay protection for mutating stock/COA writes.
 * In-memory per process — use Redis for multi-replica deployments.
 */
export default class IdempotencyMiddleware {
  private static store = new Map<string, Entry>()
  private static TTL_MS = 24 * 60 * 60 * 1000

  async handle(ctx: HttpContext, next: NextFn) {
    const key = ctx.request.header('idempotency-key')?.trim()
    if (!key) return next()

    const orgId = ctx.auth.user?.organizationId ?? ctx.platformUser?.organizationId ?? 'anon'
    const cacheKey = `${orgId}:${ctx.request.method()}:${ctx.request.url()}:${key}`
    const now = Date.now()
    const hit = IdempotencyMiddleware.store.get(cacheKey)
    if (hit && hit.expiresAt > now) {
      return ctx.response.status(hit.status).send(hit.body)
    }

    await next()

    const status = ctx.response.getStatus()
    if (status >= 200 && status < 300) {
      IdempotencyMiddleware.store.set(cacheKey, {
        status,
        body: ctx.response.getBody(),
        expiresAt: now + IdempotencyMiddleware.TTL_MS,
      })
    }

    if (IdempotencyMiddleware.store.size > 5_000) {
      for (const [k, e] of IdempotencyMiddleware.store) {
        if (e.expiresAt <= now) IdempotencyMiddleware.store.delete(k)
      }
    }
  }
}
