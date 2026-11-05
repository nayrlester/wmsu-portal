import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '../..')
const mapPath = resolve(root, 'infrastructure/database/source-map.json')
const map = JSON.parse(readFileSync(mapPath, 'utf8'))

const execute = process.argv.includes('--execute')
const moduleFilter = (() => {
  const idx = process.argv.indexOf('--module')
  return idx >= 0 ? process.argv[idx + 1] : null
})()

function loadEnvFile(path, { override = false } = {}) {
  if (!existsSync(path)) return
  for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const t = line.trim()
    if (!t || t.startsWith('#')) continue
    const i = t.indexOf('=')
    if (i < 0) continue
    const key = t.slice(0, i).trim()
    let val = t.slice(i + 1).trim()
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1)
    }
    if (override || !(key in process.env)) process.env[key] = val
  }
}

loadEnvFile(resolve(root, '.env'), { override: true })
loadEnvFile(resolve(root, 'apps/base-api/.env'), { override: true })

const dbUser = process.env.CIS_DB_USER || process.env.DB_USER || 'wmsu'
const dbPassword = process.env.CIS_DB_PASSWORD || process.env.DB_PASSWORD || 'wmsu_dev_change_me'
const dbHost = process.env.CIS_DB_HOST || process.env.DB_HOST || '127.0.0.1'
const dbPort = process.env.CIS_DB_PORT || process.env.DB_PORT || '5433'
const dbName = process.env.CIS_DB_DATABASE || process.env.POSTGRES_DB || 'wmsu_cis'
const targetUrl =
  process.env.DATABASE_URL ||
  `postgresql://${dbUser}:${dbPassword}@${dbHost}:${dbPort}/${dbName}`

const sources = map.sources.filter((s) => !moduleFilter || s.module === moduleFilter)
const outDir = resolve(root, 'tmp/phase3-dumps')
mkdirSync(outDir, { recursive: true })

const plan = sources.map((s) => {
  const dumpFile = resolve(outDir, `${s.module}_${s.sourceSchema}.sql`)
  return {
    ...s,
    dumpFile,
    dumpCommand: `pg_dump --schema=${s.sourceSchema} --no-owner --no-privileges ${s.sourceDatabase}`,
    restoreNote: `Restore into target schema ${s.targetSchema} on ${map.targetDatabase} (rewrite schema name as needed)`,
  }
})

const report = {
  mode: execute ? 'execute' : 'dry-run',
  phase: map.phase,
  targetDatabase: map.targetDatabase,
  targetUrl: targetUrl.replace(/:[^:@/]+@/, ':***@'),
  generatedAt: new Date().toISOString(),
  steps: plan,
  warnings: [
    'Default mode is dry-run. Pass --execute only after backups and schema-name confirmation.',
    'Do not drop satellite databases until Phase 4.',
    'Library/documents sourceSchema may need correction before execute.',
    'Object blobs for UDMS/TORMS remain in S3/MinIO — metadata only in Postgres.',
  ],
}

const reportPath = resolve(outDir, 'consolidation-plan.json')
writeFileSync(reportPath, JSON.stringify(report, null, 2))
console.log(JSON.stringify(report, null, 2))
console.log(`\nWrote plan: ${reportPath}`)

if (!execute) {
  console.log('\nDry-run only. Re-run with --execute --module=<name> to dump one module (still no auto-restore).')
  process.exit(0)
}

if (!moduleFilter) {
  console.error('--execute requires --module=<name> to limit blast radius')
  process.exit(1)
}

const step = plan[0]
if (!step) {
  console.error(`Unknown module ${moduleFilter}`)
  process.exit(1)
}

const host = process.env.SOURCE_PGHOST || process.env.DB_HOST || '127.0.0.1'
const port = process.env.SOURCE_PGPORT || '5432'
const user = process.env.SOURCE_PGUSER || process.env.DB_USER || 'wmsu'
const password = process.env.SOURCE_PGPASSWORD || process.env.DB_PASSWORD || ''

console.log(`Dumping ${step.module} schema ${step.sourceSchema} from ${step.sourceDatabase}…`)
const env = { ...process.env, PGPASSWORD: password }
const dump = spawnSync(
  'pg_dump',
  [
    `-h`,
    host,
    `-p`,
    String(port),
    `-U`,
    user,
    `-d`,
    step.sourceDatabase,
    `--schema=${step.sourceSchema}`,
    `--no-owner`,
    `--no-privileges`,
    `-f`,
    step.dumpFile,
  ],
  { encoding: 'utf8', env, shell: true }
)

if (dump.status !== 0) {
  console.error(dump.stderr || dump.stdout || 'pg_dump failed')
  process.exit(1)
}

console.log(`Dump written: ${step.dumpFile}`)
console.log('Restore is manual: rewrite schema name to targetSchema, then psql against wmsu_cis.')
