/**
 * Maps PaaS env vars (Railway, etc.) into Adonis DB_* keys before `start/env.ts` validation.
 */
export function applyPlatformEnvMappings(): void {
  mapDatabaseUrl()
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
  if (!databaseUrl || process.env.DB_HOST) return

  const url = new URL(databaseUrl)
  process.env.DB_HOST = url.hostname
  process.env.DB_PORT = url.port || '5432'
  process.env.DB_USER = decodeURIComponent(url.username)
  process.env.DB_PASSWORD = decodeURIComponent(url.password)
  process.env.DB_DATABASE = url.pathname.replace(/^\//, '')

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

function mapRailwayPublicDomains(): void {
  const apiDomain = process.env.RAILWAY_PUBLIC_DOMAIN
  if (apiDomain && !process.env.APP_URL) {
    process.env.APP_URL = `https://${apiDomain}`
  }
}
