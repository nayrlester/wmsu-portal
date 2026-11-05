import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'

type Bucket = { count: number; resetAt: number }

/**
 * In-memory sliding-window rate limiter (per-process).
 * For multi-replica production, front with Redis or an edge rate limiter.
 */
export default class RateLimitMiddleware {
  private static buckets = new Map<string, Bucket>()

  /**
   * @param options.max  Max requests in window
   * @param options.windowMs  Window length in ms
   * @param options.key  Optional key override (default: IP + path)
   */
  async handle(
    ctx: HttpContext,
    next: NextFn,
    options: { max?: number; windowMs?: number; prefix?: string } = {}
  ) {
    const max = options.max ?? 120
    const windowMs = options.windowMs ?? 60_000
    const prefix = options.prefix ?? 'api'
    const ip = ctx.request.ip()
    const key = `${prefix}:${ip}:${ctx.request.url()}`

    const now = Date.now()
    let bucket = RateLimitMiddleware.buckets.get(key)
    if (!bucket || bucket.resetAt <= now) {
      bucket = { count: 0, resetAt: now + windowMs }
      RateLimitMiddleware.buckets.set(key, bucket)
    }

    bucket.count += 1
    const remaining = Math.max(0, max - bucket.count)
    ctx.response.header('X-RateLimit-Limit', String(max))
    ctx.response.header('X-RateLimit-Remaining', String(remaining))
    ctx.response.header('X-RateLimit-Reset', String(Math.ceil(bucket.resetAt / 1000)))

    if (bucket.count > max) {
      return ctx.response.tooManyRequests({
        error: 'Too many requests. Please try again later.',
        retryAfterSec: Math.ceil((bucket.resetAt - now) / 1000),
      })
    }

    // Opportunistic cleanup
    if (RateLimitMiddleware.buckets.size > 10_000) {
      for (const [k, b] of RateLimitMiddleware.buckets) {
        if (b.resetAt <= now) RateLimitMiddleware.buckets.delete(k)
      }
    }

    return next()
  }
}
