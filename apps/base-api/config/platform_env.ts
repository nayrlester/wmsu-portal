/**
 * Maps PaaS env vars (Railway, etc.) into Adonis DB_* keys before `start/env.ts` validation.
 */
export function applyPlatformEnvMappings(): void {
  mapDatabaseUrl()
  mapRedisUrl()
  mapRailwayPublicDomains()
  mapRailwayRuntime()
}

function mapRailwayRuntime(): void {
  if (!process.env.RAILWAY_ENVIRONMENT && !process.env.RAILWAY_PROJECT_ID) return

  const host = process.env.HOST
  if (!host || host === 'localhost' || host === '127.0.0.1') {
    process.env.HOST = '0.0.0.0'
  }
}

function mapDatabaseUrl(): void {
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) return

  const url = new URL(databaseUrl)
  const hostIsInternal = (process.env.DB_HOST || '').includes('.railway.internal')
  const urlIsReachable =
    !url.hostname.includes('.railway.internal') || Boolean(process.env.RAILWAY_ENVIRONMENT)

  if (process.env.DB_HOST && !(hostIsInternal && urlIsReachable)) return

  process.env.DB_HOST = url.hostname
  process.env.DB_PORT = url.port || '5432'
  process.env.DB_USER = decodeURIComponent(url.username)
  process.env.DB_PASSWORD = decodeURIComponent(url.password)
  process.env.DB_DATABASE = url.pathname.replace(/^\//, '').split('?')[0]

  const sslMode = url.searchParams.get('sslmode')
  if (sslMode && sslMode !== 'disable' && process.env.DB_SSL === undefined) {
    process.env.DB_SSL = 'true'
  } else if (
    !sslMode &&
    process.env.DB_SSL === undefined &&
    (url.hostname.includes('railway') ||
      url.hostname.includes('amazonaws.com') ||
      url.hostname.includes('supabase.com'))
  ) {
    process.env.DB_SSL = 'true'
  }
}

function mapRedisUrl(): void {
  const redisUrl = process.env.REDIS_URL
  const hostLooksLikeUrl = (process.env.REDIS_HOST || '').includes('://')
  if (!redisUrl && !hostLooksLikeUrl) return

  try {
    const url = new URL(hostLooksLikeUrl ? process.env.REDIS_HOST! : redisUrl!)
    if (!process.env.REDIS_HOST || hostLooksLikeUrl) {
      process.env.REDIS_HOST = url.hostname
    }
    if (!process.env.REDIS_PORT || hostLooksLikeUrl) {
      process.env.REDIS_PORT = url.port || '6379'
    }
    if (url.password && (!process.env.REDIS_PASSWORD || hostLooksLikeUrl)) {
      process.env.REDIS_PASSWORD = decodeURIComponent(url.password)
    }
    if (url.username && (!process.env.REDIS_USER || hostLooksLikeUrl)) {
      process.env.REDIS_USER = decodeURIComponent(url.username)
    }
  } catch {
    return
  }
}

function mapRailwayPublicDomains(): void {
  const apiDomain = process.env.RAILWAY_PUBLIC_DOMAIN
  if (apiDomain && !process.env.APP_URL) {
    process.env.APP_URL = `https://${apiDomain}`
  }
}
