import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const LOCAL_ENV_OVERRIDE_KEYS = new Set([
  'DB_HOST',
  'DB_PORT',
  'DB_USER',
  'DB_PASSWORD',
  'DB_DATABASE',
  'DB_SCHEMA',
  'DB_SSL',
  'DATABASE_URL',
  'REDIS_HOST',
  'REDIS_PORT',
  'REDIS_PASSWORD',
  'REDIS_URL',
  'POSTGRES_HOST_PORT',
  'REDIS_HOST_PORT',
])

function stripEnvQuotes(value: string): string {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1)
  }
  return value
}

/** Load `apps/base-api/.env` so mappings and ace commands see Docker ports (5433) before Railway URL merging. */
export function preloadLocalAppEnv(appRoot: URL): void {
  const path = join(fileURLToPath(appRoot), '.env')
  if (!existsSync(path)) return

  const text = readFileSync(path, 'utf8')
  for (const line of text.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq <= 0) continue
    const key = trimmed.slice(0, eq).trim()
    const value = stripEnvQuotes(trimmed.slice(eq + 1).trim())
    if (LOCAL_ENV_OVERRIDE_KEYS.has(key) || process.env[key] === undefined) {
      process.env[key] = value
    }
  }
}

/**
 * Maps PaaS env vars (Railway, etc.) into Adonis DB_* keys before `start/env.ts` validation.
 */
export function applyPlatformEnvMappings(appRoot?: URL): void {
  if (appRoot) {
    preloadLocalAppEnv(appRoot)
  }
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

  if (process.env.DB_HOST && process.env.DB_PORT && process.env.DB_DATABASE) {
    if (!(hostIsInternal && urlIsReachable)) return
  }

  const resolvedPort =
    url.port || process.env.POSTGRES_HOST_PORT || process.env.DB_PORT || '5432'

  if (!process.env.DB_HOST) process.env.DB_HOST = url.hostname
  if (!process.env.DB_PORT) process.env.DB_PORT = resolvedPort
  if (!process.env.DB_USER) process.env.DB_USER = decodeURIComponent(url.username)
  if (!process.env.DB_PASSWORD) process.env.DB_PASSWORD = decodeURIComponent(url.password)
  if (!process.env.DB_DATABASE) {
    process.env.DB_DATABASE = url.pathname.replace(/^\//, '').split('?')[0]
  }

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
