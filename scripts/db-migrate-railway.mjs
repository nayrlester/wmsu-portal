import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const apiRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'apps', 'base-api')

function pickDatabaseUrl() {
  const candidates = [
    process.env.RAILWAY_PUBLIC_DATABASE_URL,
    process.env.DATABASE_PUBLIC_URL,
    process.env.DATABASE_URL,
  ].filter(Boolean)
  for (const url of candidates) {
    if (typeof url !== 'string') continue
    const trimmed = url.trim()
    if (trimmed.includes('.railway.internal')) continue
    if (trimmed.includes('@....') || trimmed.includes(':PORT/')) continue
    if (!/^postgres(ql)?:\/\/.+@.+:\d+\/.+/i.test(trimmed)) continue
    return trimmed
  }
  return null
}

const databaseUrl = pickDatabaseUrl()
if (!databaseUrl) {
  console.error('')
  console.error('Cannot reach Railway Postgres from this machine with the current env.')
  console.error('')
  console.error('Option A — Railway CLI (uses in-network DATABASE_URL on the service):')
  console.error('  railway login')
  console.error('  cd WMSU/wmsu-platform && railway link')
  console.error('  railway run --service cis-base-api node ace migration:run --force')
  console.error('')
  console.error('Option B — Public TCP URL from Railway → Postgres → Connect:')
  console.error('  Copy the full public URL (not postgres.railway.internal).')
  console.error('  Git Bash:')
  console.error("    export RAILWAY_PUBLIC_DATABASE_URL='postgresql://user:pass@host:port/railway'")
  console.error('    pnpm run db:migrate:railway')
  console.error('  PowerShell:')
  console.error('    $env:RAILWAY_PUBLIC_DATABASE_URL="postgresql://user:pass@host:port/railway"')
  console.error('    pnpm run db:migrate:railway')
  console.error('')
  console.error('Option C — Redeploy cis-base-api (preDeployCommand runs migration:run --force).')
  console.error('')
  process.exit(1)
}

const parsed = new URL(databaseUrl)
const env = { ...process.env }
env.DATABASE_URL = databaseUrl
env.DB_URL = databaseUrl
env.DB_HOST = parsed.hostname
env.DB_PORT = parsed.port || '5432'
env.DB_USER = decodeURIComponent(parsed.username)
env.DB_PASSWORD = decodeURIComponent(parsed.password)
env.DB_DATABASE = parsed.pathname.replace(/^\//, '').split('?')[0]
env.DB_SSL = 'true'
if (!env.DB_SCHEMA) env.DB_SCHEMA = 'common'

const result = spawnSync('node', ['ace', 'migration:run', '--force'], {
  cwd: apiRoot,
  env,
  stdio: 'inherit',
  shell: process.platform === 'win32',
})

process.exit(result.status ?? 1)
