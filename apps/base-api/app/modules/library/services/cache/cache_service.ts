import { getRedis } from '#modules/library/services/redis/redis_service'

const CACHE_PREFIX = 'librastack:cache'

export default class CacheService {
  private redis = getRedis()

  private key(tenantId: string | null, key: string): string {
    return `${CACHE_PREFIX}:${tenantId ?? 'global'}:${key}`
  }

  async get<T>(key: string, tenantId?: string | null): Promise<T | null> {
    const raw = await this.redis.get(this.key(tenantId ?? null, key))
    if (!raw) return null
    try {
      return JSON.parse(raw) as T
    } catch {
      return null
    }
  }

  async set(key: string, value: unknown, ttlSeconds: number, tenantId?: string | null): Promise<void> {
    await this.redis.setex(this.key(tenantId ?? null, key), ttlSeconds, JSON.stringify(value))
  }

  async del(key: string, tenantId?: string | null): Promise<void> {
    await this.redis.del(this.key(tenantId ?? null, key))
  }

  async remember<T>(
    key: string,
    ttlSeconds: number,
    factory: () => Promise<T>,
    tenantId?: string | null
  ): Promise<T> {
    const cached = await this.get<T>(key, tenantId)
    if (cached !== null) return cached

    const value = await factory()
    await this.set(key, value, ttlSeconds, tenantId)
    return value
  }
}
