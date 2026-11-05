import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '../..')
const map = JSON.parse(
  readFileSync(resolve(root, 'infrastructure/database/source-map.json'), 'utf8')
)

function argValue(name) {
  const eq = process.argv.find((a) => a.startsWith(`${name}=`))
  if (eq) return eq.slice(name.length + 1)
  const idx = process.argv.indexOf(name)
  if (idx >= 0) return process.argv[idx + 1] ?? null
  return null
}

const moduleName = argValue('--module')
const dryRun = process.argv.includes('--dry-run')

if (!moduleName) {
  console.error('Usage: node scripts/phase3/absorb-module-migrations.mjs --module=inventory [--dry-run]')
  process.exit(1)
}

const step = map.sources.find((s) => s.module === moduleName)
if (!step) {
  console.error(`Unknown module: ${moduleName}`)
  process.exit(1)
}

const satelliteApiByModule = {
  common: resolve(root, '../wmsu-api/apps/api'),
  enrollment: resolve(root, '../wmsu-enrollment/apps/api'),
  finance: resolve(root, '../wmsu-finance/apps/api'),
  records: resolve(root, '../wmsu-records/apps/api'),
  inventory: resolve(root, '../wmsu-inventory/apps/api'),
  library: resolve(root, '../wmsu-library/apps/api'),
  documents: resolve(root, '../wmsu-document/api'),
}

function readEnvMap(path) {
  const out = {}
  if (!existsSync(path)) return out
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
    out[key] = val
  }
  return out
}

const platformEnv = {
  ...readEnvMap(resolve(root, '.env')),
  ...readEnvMap(resolve(root, 'apps/base-api/.env')),
}

const targetHost = process.env.CIS_DB_HOST || platformEnv.DB_HOST || '127.0.0.1'
const targetPort =
  process.env.CIS_DB_PORT || platformEnv.DB_PORT || platformEnv.POSTGRES_HOST_PORT || '5433'
const targetUser =
  process.env.CIS_DB_USER || platformEnv.DB_USER || platformEnv.POSTGRES_USER || 'wmsu'
const targetPassword =
  process.env.CIS_DB_PASSWORD ||
  platformEnv.DB_PASSWORD ||
  platformEnv.POSTGRES_PASSWORD ||
  'wmsu_dev_change_me'
const targetDatabase =
  process.env.CIS_DB_DATABASE ||
  platformEnv.CIS_DB_DATABASE ||
  platformEnv.POSTGRES_DB ||
  map.targetDatabase ||
  'wmsu_cis'
const targetSchema = step.targetSchema
const container = process.env.WMSU_PG_CONTAINER || 'wmsu-cis-postgres'
const apiRoot = satelliteApiByModule[moduleName]

if (!apiRoot || !existsSync(apiRoot)) {
  console.error(`Satellite API root missing for ${moduleName}: ${apiRoot}`)
  process.exit(1)
}

const outDir = resolve(root, 'tmp/phase3-dumps')
mkdirSync(outDir, { recursive: true })
const stateFile = resolve(outDir, `${moduleName}-absorb-state.json`)

function run(cmd, args, opts = {}) {
  const result = spawnSync(cmd, args, {
    encoding: 'utf8',
    ...opts,
  })
  if (result.error) throw result.error
  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout || `${cmd} failed`)
  }
  return result.stdout
}

function psqlFile(sql, label) {
  const file = resolve(outDir, `${moduleName}_${label}.sql`)
  writeFileSync(file, sql)
  const remote = `/tmp/${moduleName}_${label}.sql`
  const inspect = spawnSync('docker', ['inspect', container], { encoding: 'utf8' })
  if (inspect.status === 0) {
    run('docker', ['cp', file, `${container}:${remote}`])
    run('docker', [
      'exec',
      container,
      'psql',
      '-U',
      targetUser,
      '-d',
      targetDatabase,
      '-v',
      'ON_ERROR_STOP=1',
      '-f',
      remote,
    ])
    return
  }
  run(
    'psql',
    [
      '-h',
      targetHost,
      '-p',
      String(targetPort),
      '-U',
      targetUser,
      '-d',
      targetDatabase,
      '-v',
      'ON_ERROR_STOP=1',
      '-f',
      file,
    ],
    { env: { ...process.env, PGPASSWORD: targetPassword } }
  )
}

function psqlScalar(sql) {
  const inspect = spawnSync('docker', ['inspect', container], { encoding: 'utf8' })
  let out
  if (inspect.status === 0) {
    out = run('docker', [
      'exec',
      container,
      'psql',
      '-U',
      targetUser,
      '-d',
      targetDatabase,
      '-t',
      '-A',
      '-c',
      sql,
    ])
  } else {
    out = run(
      'psql',
      [
        '-h',
        targetHost,
        '-p',
        String(targetPort),
        '-U',
        targetUser,
        '-d',
        targetDatabase,
        '-t',
        '-A',
        '-c',
        sql,
      ],
      { env: { ...process.env, PGPASSWORD: targetPassword } }
    )
  }
  return String(out).trim()
}

function prepareTarget() {
  const sql = [
    'CREATE SCHEMA IF NOT EXISTS extensions;',
    'CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;',
    'CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA extensions;',
    `DROP SCHEMA IF EXISTS ${targetSchema} CASCADE;`,
    `CREATE SCHEMA ${targetSchema};`,
    `GRANT USAGE ON SCHEMA ${targetSchema} TO wmsu_${moduleName}_app, wmsu_migrator;`,
    `ALTER DEFAULT PRIVILEGES IN SCHEMA ${targetSchema} GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO wmsu_${moduleName}_app;`,
  ].join('\n')
  console.log(`Preparing ${targetDatabase}.${targetSchema} + extensions…`)
  psqlFile(sql, `prepare_${targetSchema}`)
}

function runMigrations() {
  const satEnv = readEnvMap(resolve(apiRoot, '.env'))
  const env = {
    ...process.env,
    ...satEnv,
    DB_HOST: targetHost,
    DB_PORT: String(targetPort),
    DB_USER: targetUser,
    DB_PASSWORD: targetPassword,
    DB_DATABASE: targetDatabase,
    DB_SCHEMA: targetSchema,
    DB_SSL: 'false',
    NODE_ENV: process.env.NODE_ENV || satEnv.NODE_ENV || 'development',
  }
  console.log(
    `Running ${moduleName} Lucid migrations → ${targetUser}@${targetHost}:${targetPort}/${targetDatabase} schema=${targetSchema}`
  )
  if (!existsSync(resolve(apiRoot, 'node_modules/@adonisjs/core'))) {
    console.log('Installing satellite API dependencies…')
    run(
      process.platform === 'win32' ? 'npm.cmd' : 'npm',
      ['install', '--no-audit', '--no-fund'],
      { cwd: apiRoot, env, shell: true }
    )
  }
  run('node', ['ace.js', 'migration:run', '--force'], { cwd: apiRoot, env, shell: true })
}

function cleanupLeftoverSchemas() {
  const leftovers = ['uims']
  const drops = leftovers
    .map(
      (s) =>
        `DO $$ BEGIN IF EXISTS (SELECT 1 FROM pg_namespace WHERE nspname='${s}') AND NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='${s}') THEN DROP SCHEMA ${s}; END IF; END $$;`
    )
    .join('\n')
  psqlFile(drops, 'cleanup_leftover_schemas')
}

function verifyAndRecord() {
  const tables = Number(
    psqlScalar(
      `SELECT count(*)::int FROM information_schema.tables WHERE table_schema='${targetSchema}'`
    ) || '0'
  )
  const state = {
    module: moduleName,
    phase: 'phase3b-module-restore',
    method: 'migrations-absorb',
    reason: 'source dump unreachable; structure absorbed via satellite Lucid migrations',
    target: {
      host: targetHost,
      port: Number(targetPort),
      database: targetDatabase,
      schema: targetSchema,
      tableCount: tables,
    },
    sourceDatabase: step.sourceDatabase,
    sourceSchema: step.sourceSchema,
    restoredAt: new Date().toISOString(),
    satelliteUntouched: true,
    dataCopied: false,
  }
  writeFileSync(stateFile, JSON.stringify(state, null, 2))

  const progressPath = resolve(root, 'infrastructure/database/phase3-progress.json')
  let progress = {
    phase: 'phase3b-module-restore',
    targetDatabase,
    completedModules: [],
    pendingModules: map.sources.map((s) => s.module).filter((m) => m !== moduleName),
  }
  if (existsSync(progressPath)) {
    try {
      progress = JSON.parse(readFileSync(progressPath, 'utf8'))
    } catch {
      // keep defaults
    }
  }
  const completed = Array.isArray(progress.completedModules) ? progress.completedModules : []
  const without = completed.filter((c) => c.module !== moduleName)
  without.push({
    module: moduleName,
    targetSchema,
    sourceDatabase: step.sourceDatabase,
    sourceSchema: step.sourceSchema,
    tableCount: tables,
    restoredAt: state.restoredAt,
    satelliteUntouched: true,
    method: 'migrations-absorb',
    dataCopied: false,
    notes:
      'Remote Supabase dump failed (tenant not found); structure absorbed via wmsu-inventory Lucid migrations into wmsu_cis.inventory',
  })
  progress.phase = 'phase3b-module-restore'
  progress.targetDatabase = targetDatabase
  progress.completedModules = without
  progress.pendingModules = map.sources
    .map((s) => s.module)
    .filter((m) => !without.some((c) => c.module === m))
  writeFileSync(progressPath, JSON.stringify(progress, null, 2))

  console.log(JSON.stringify(state, null, 2))
  if (tables < 1) {
    throw new Error(`Verification failed: schema ${targetSchema} has ${tables} tables`)
  }
  return state
}

const plan = {
  module: moduleName,
  method: 'migrations-absorb',
  apiRoot,
  targetSchema,
  targetDatabase,
  targetHost,
  targetPort,
}

console.log(JSON.stringify(plan, null, 2))
if (dryRun) {
  console.log('Dry-run only.')
  process.exit(0)
}

try {
  prepareTarget()
  runMigrations()
  cleanupLeftoverSchemas()
  verifyAndRecord()
  console.log(`Phase 3b ${moduleName} absorb finished. Satellite DB left intact.`)
} catch (err) {
  console.error(String(err instanceof Error ? err.message : err))
  process.exit(1)
}
