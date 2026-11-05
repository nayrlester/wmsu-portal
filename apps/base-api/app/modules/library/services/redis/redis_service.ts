import { Redis } from 'ioredis'
import redisConfig from '#config/redis'

let client: Redis | null = null

export function getRedis(): Redis {
  if (!client) {
    client = new Redis(redisConfig)
  }
  return client
}

export async function checkRedisConnection(): Promise<boolean> {
  try {
    const redis = getRedis()
    if (redis.status !== 'ready') {
      await redis.connect()
    }
    const pong = await redis.ping()
    return pong === 'PONG'
  } catch {
    return false
  }
}

export async function closeRedis(): Promise<void> {
  if (client) {
    await client.quit()
    client = null
  }
}
