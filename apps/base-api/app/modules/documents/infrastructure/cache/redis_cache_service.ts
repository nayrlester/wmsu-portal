type CacheEntry = {
  value: string
  expiresAt: number
}

const store = new Map<string, CacheEntry>()

export class RedisCacheService {
  async get<T>(key: string): Promise<T | null> {
    const entry = store.get(key)
    if (!entry) return null
    if (Date.now() >= entry.expiresAt) {
      store.delete(key)
      return null
    }
    try {
      return JSON.parse(entry.value) as T
    } catch {
      return null
    }
  }

  async set(key: string, value: unknown, ttlSeconds: number): Promise<void> {
    store.set(key, {
      value: JSON.stringify(value),
      expiresAt: Date.now() + Math.max(1, ttlSeconds) * 1000,
    })
  }

  async forget(key: string): Promise<void> {
    store.delete(key)
  }

  async remember<T>(key: string, ttlSeconds: number, factory: () => Promise<T>): Promise<T> {
    const cached = await this.get<T>(key)
    if (cached !== null) return cached
    const value = await factory()
    await this.set(key, value, ttlSeconds)
    return value
  }
}

export const cacheService = new RedisCacheService()
