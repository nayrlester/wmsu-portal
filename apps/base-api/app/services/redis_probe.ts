import { Redis } from 'ioredis'
import env from '#start/env'

export async function probeRedis() {
  const started = Date.now()
  const redis = new Redis({
    host: env.get('REDIS_HOST'),
    port: env.get('REDIS_PORT'),
    password: env.get('REDIS_PASSWORD'),
    maxRetriesPerRequest: 1,
    connectTimeout: 3000,
    lazyConnect: true,
  })

  try {
    await redis.connect()
    const pong = await redis.ping()
    return {
      name: 'redis',
      status: pong === 'PONG' ? ('ok' as const) : ('degraded' as const),
      latencyMs: Date.now() - started,
      detail: pong,
    }
  } catch (error) {
    return {
      name: 'redis',
      status: 'down' as const,
      latencyMs: Date.now() - started,
      detail: error instanceof Error ? error.message : 'redis unavailable',
    }
  } finally {
    redis.disconnect()
  }
}
