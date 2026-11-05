import type { HttpContext } from '@adonisjs/core/http'
import db from '@adonisjs/lucid/services/db'
import redis from '@adonisjs/redis/services/main'

type CheckResult = { status: 'ok' | 'error'; latencyMs?: number; message?: string }

export default class HealthController {
  async live({ response }: HttpContext) {
    return response.ok({
      status: 'alive',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    })
  }

  async ready({ response }: HttpContext) {
    const checks: Record<string, CheckResult> = {}

    const [dbResult, redisResult] = await Promise.allSettled([
      (async () => {
        const dbStart = Date.now()
        await db.rawQuery('SELECT 1')
        return { status: 'ok' as const, latencyMs: Date.now() - dbStart }
      })(),
      (async () => {
        const redisStart = Date.now()
        const pong = await redis.ping()
        if (pong !== 'PONG') {
          throw new Error(`Unexpected Redis response: ${pong}`)
        }
        return { status: 'ok' as const, latencyMs: Date.now() - redisStart }
      })(),
    ])

    let healthy = true

    if (dbResult.status === 'fulfilled') {
      checks.database = dbResult.value
    } else {
      healthy = false
      checks.database = {
        status: 'error',
        message:
          dbResult.reason instanceof Error ? dbResult.reason.message : 'Database unreachable',
      }
    }

    if (redisResult.status === 'fulfilled') {
      checks.redis = redisResult.value
    } else {
      healthy = false
      checks.redis = {
        status: 'error',
        message:
          redisResult.reason instanceof Error ? redisResult.reason.message : 'Redis unreachable',
      }
    }

    const body = {
      status: healthy ? 'ready' : 'not_ready',
      timestamp: new Date().toISOString(),
      checks,
    }

    return healthy ? response.ok(body) : response.serviceUnavailable(body)
  }
}
