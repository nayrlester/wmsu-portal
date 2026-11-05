import { spawnSync } from 'node:child_process'
import { mkdirSync, existsSync, rmSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const apiRoot = path.join(root, 'apps', 'base-api')
const dumpDir = path.join(root, 'tmp')
const dumpPath = path.join(dumpDir, 'wmsu-cis-local.dump')
const container = 'wmsu-cis-postgres'

const localUser = process.env.LOCAL_DB_USER || 'wmsu'
const localPassword = process.env.LOCAL_DB_PASSWORD || 'wmsu_dev_change_me'
const localDb = process.env.LOCAL_DB_NAME || 'wmsu_cis'

function pickRailwayUrl() {
  const candidates = [
    process.env.RAILWAY_PUBLIC_DATABASE_URL,
    process.env.DATABASE_PUBLIC_URL,
  ].filter(Boolean)
  for (const url of candidates) {
    if (typeof url !== 'string') continue
    const trimmed = url.trim()
    if (trimmed.includes('.railway.internal')) continue
    if (!/^postgres(ql)?:\/\/.+@.+:\d+\/.+/i.test(trimmed)) continue
    return trimmed
  }
  return null
}

function run(label, command, args, options = {}) {
  const result = spawnSync(command, args, {
    stdio: 'inherit',
    shell: process.platform === 'win32',
    ...options,
  })
  if (result.status !== 0) {
    console.error(`\n[db:push] Failed: ${label}\n`)
    process.exit(result.status ?? 1)
  }
}

const railwayUrl = pickRailwayUrl()
if (!railwayUrl) {
  console.error('')
  console.error('Set Railway public Postgres URL (Git Bash):')
  console.error("  export RAILWAY_PUBLIC_DATABASE_URL='postgresql://postgres:...@....proxy.rlwy.net:PORT/railway'")
  console.error('  pnpm run db:push:railway')
  console.error('')
  process.exit(1)
}

const dockerPs = spawnSync('docker', ['ps', '--filter', `name=${container}`, '--format', '{{.Names}}'], {
  encoding: 'utf8',
})
if (!dockerPs.stdout?.includes(container)) {
  console.error(`Local Postgres container "${container}" is not running. Run: pnpm run infra:up`)
  process.exit(1)
}

console.log('\n[1/3] Lucid migrations on Railway (schema must match local)…\n')
const migrateEnv = { ...process.env, RAILWAY_PUBLIC_DATABASE_URL: railwayUrl }
run('migrate', 'node', ['scripts/db-migrate-railway.mjs'], { cwd: root, env: migrateEnv })

mkdirSync(dumpDir, { recursive: true })
if (existsSync(dumpPath)) rmSync(dumpPath)

console.log('\n[2/3] Dump local Docker database wmsu_cis…\n')
run(
  'pg_dump',
  'docker',
  [
    'exec',
    '-e',
    `PGPASSWORD=${localPassword}`,
    container,
    'pg_dump',
    '-U',
    localUser,
    '-d',
    localDb,
    '-Fc',
    '--no-owner',
    '--no-acl',
    '-f',
    '/tmp/wmsu-cis-local.dump',
  ],
  { env: process.env }
)

run('docker cp', 'docker', ['cp', `${container}:/tmp/wmsu-cis-local.dump`, dumpPath])

console.log('\n[3/3] Restore into Railway (replaces existing CIS data)…\n')
const restore = spawnSync(
  'docker',
  [
    'run',
    '--rm',
    '-v',
    `${dumpPath}:/backup.dump:ro`,
    '-e',
    `DATABASE_URL=${railwayUrl}`,
    '-e',
    'PGSSLMODE=require',
    'postgres:16-alpine',
    'pg_restore',
    '--verbose',
    '--no-owner',
    '--no-acl',
    '--clean',
    '--if-exists',
    '-d',
    railwayUrl,
    '/backup.dump',
  ],
  { stdio: 'inherit', shell: process.platform === 'win32' }
)

if (restore.status !== 0 && restore.status !== 1) {
  console.error('\n[db:push] pg_restore exited with errors. Review output above.\n')
  process.exit(restore.status ?? 1)
}

console.log('\n[db:push] Done. Railway Postgres now mirrors local wmsu_cis data.')
console.log('[db:push] Identity users/platforms live in wmsu-api DB — sync that separately if needed.\n')
