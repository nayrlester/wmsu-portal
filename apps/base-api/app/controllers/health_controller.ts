import type { HttpContext } from '@adonisjs/core/http'
import db from '@adonisjs/lucid/services/db'
import env from '#start/env'
import { probeRedis } from '#services/redis_probe'
import { enqueueInfraPing } from '#services/queue_service'

export default class HealthController {
  async live({ response }: HttpContext) {
    return response.ok({
      success: true,
      message: 'alive',
      data: { status: 'alive' },
    })
  }

  async show({ response }: HttpContext) {
    const components = []

    const dbStarted = Date.now()
    try {
      await db.rawQuery('select 1 as ok')
      components.push({
        name: 'postgres',
        status: 'ok' as const,
        latencyMs: Date.now() - dbStarted,
      })
    } catch (error) {
      components.push({
        name: 'postgres',
        status: 'down' as const,
        detail: error instanceof Error ? error.message : 'database unavailable',
        latencyMs: Date.now() - dbStarted,
      })
    }

    const redis = await probeRedis()
    components.push(redis)

    const overall =
      components.every((item) => item.status === 'ok')
        ? 'ok'
        : components.some((item) => item.status === 'ok')
          ? 'degraded'
          : 'down'

    return response.status(overall === 'down' ? 503 : 200).send({
      success: overall !== 'down',
      message: overall === 'ok' ? 'healthy' : overall,
      data: {
        service: 'wmsu-cis-api',
        status: overall,
        version: env.get('APP_VERSION') ?? '0.0.1',
        components,
        checkedAt: new Date().toISOString(),
      },
    })
  }

  async ping({ response }: HttpContext) {
    const jobId = await enqueueInfraPing()
    return response.ok({
      success: true,
      message: 'pong',
      data: {
        pong: true as const,
        serverTime: new Date().toISOString(),
        queuedJobId: jobId,
      },
    })
  }
}
