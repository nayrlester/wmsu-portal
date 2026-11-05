import { config as loadDotenv } from 'dotenv'
import { existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const platformEnv = resolve(__dirname, '../../../.env')
const workerEnv = resolve(__dirname, '../.env')
if (existsSync(platformEnv)) loadDotenv({ path: platformEnv })
if (existsSync(workerEnv)) loadDotenv({ path: workerEnv, override: true })

const isProduction =
  process.env.NODE_ENV === 'production' ||
  Boolean(process.env.RAILWAY_ENVIRONMENT || process.env.RAILWAY_SERVICE_NAME)

function requireEnv(name: string, devFallback: string): string {
  const value = process.env[name]?.trim()
  if (value) return value
  if (isProduction) {
    console.error(
      `[worker] Missing ${name}. On Railway, add Postgres + Redis plugins and set ${name} on this service (e.g. \${{Postgres.DATABASE_URL}} and \${{Redis.REDIS_URL}}).`
    )
    process.exit(1)
  }
  return devFallback
}

export const redisUrl = requireEnv('REDIS_URL', 'redis://127.0.0.1:6380')
export const queueName = process.env.QUEUE_NAME?.trim() || 'wmsu-cis-jobs'
export const databaseUrl = requireEnv(
  'DATABASE_URL',
  'postgresql://wmsu:wmsu_dev_change_me@127.0.0.1:5433/wmsu_cis'
)
