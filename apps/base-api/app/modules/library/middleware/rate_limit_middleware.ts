import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import env from '#start/env'
import { getRedis } from '#modules/library/services/redis/redis_service'
import JwtService from '#modules/library/services/auth/jwt_service'
import RateLimitException from '#modules/library/exceptions/rate_limit_exception'

/**
 * Rate limiting runs on the global router stack *before* JWT middleware,
 * so we resolve the actor from the Bearer token when present.
 */
export default class RateLimitMiddleware {
  private jwt = new JwtService()

  async handle(ctx: HttpContext, next: NextFn) {
    const windowSeconds = Number(env.get('RATE_LIMIT_WINDOW_SECONDS', 60)) || 60
    const isDev = env.get('NODE_ENV') === 'development'

    const defaultAuthed = isDev ? 2000 : 600
    const defaultAnon = isDev ? 300 : 60

    const authenticatedLimit =
      Number(env.get('RATE_LIMIT_AUTHENTICATED', defaultAuthed)) || defaultAuthed
    const unauthenticatedLimit =
      Number(env.get('RATE_LIMIT_UNAUTHENTICATED', defaultAnon)) || defaultAnon

    const actor = await this.resolveActor(ctx)
    const limit = actor.authenticated ? authenticatedLimit : unauthenticatedLimit
    const tenantSlug = ctx.request.header('x-tenant-slug') ?? 'global'
    const bucket = Math.floor(Date.now() / (windowSeconds * 1000))
    const key = `ratelimit:${tenantSlug}:${actor.key}:${bucket}`

    const redis = getRedis()
    const count = await redis.incr(key)
    if (count === 1) {
      await redis.expire(key, windowSeconds)
    }

    const remaining = Math.max(0, limit - count)
    ctx.response.header('X-RateLimit-Limit', String(limit))
    ctx.response.header('X-RateLimit-Remaining', String(remaining))
    ctx.response.header('X-RateLimit-Reset', String(windowSeconds))

    if (count > limit) {
      throw new RateLimitException('Too many requests. Please try again later.')
    }

    await next()
  }

  private async resolveActor(ctx: HttpContext): Promise<{ key: string; authenticated: boolean }> {
    if (ctx.authUser?.id) {
      return { key: `user:${ctx.authUser.id}`, authenticated: true }
    }

    const header = ctx.request.header('authorization')
    if (header?.startsWith('Bearer ')) {
      const token = header.slice(7).trim()
      if (token) {
        try {
          const payload = await this.jwt.verifyAccessToken(token)
          return { key: `user:${payload.sub}`, authenticated: true }
        } catch {
          // Invalid/expired token still counts toward anon IP budget
        }
      }
    }

    return { key: `ip:${ctx.request.ip()}`, authenticated: false }
  }
}
