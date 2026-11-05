import { readFileSync, existsSync, mkdirSync, writeFileSync, copyFileSync } from 'node:fs'
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
const rollback = process.argv.includes('--rollback')

if (!moduleName) {
  console.error(
    'Usage: node scripts/phase3/cutover-module.mjs --module=common [--dry-run|--rollback]'
  )
  process.exit(1)
}

const step = map.sources.find((s) => s.module === moduleName)
if (!step) {
  console.error(`Unknown module: ${moduleName}`)
  process.exit(1)
}

const satelliteEnvByModule = {
  common: resolve(root, '../wmsu-api/apps/api/.env'),
  enrollment: resolve(root, '../wmsu-enrollment/apps/api/.env'),
  finance: resolve(root, '../wmsu-finance/apps/api/.env'),
  records: resolve(root, '../wmsu-records/apps/api/.env'),
  inventory: resolve(root, '../wmsu-inventory/apps/api/.env'),
  library: resolve(root, '../wmsu-library/apps/api/.env'),
  documents: resolve(root, '../wmsu-document/api/.env'),
}

const searchPathByModule = {
  common: 'common,public,extensions',
  enrollment: 'enrollment,common,public,extensions',
  finance: 'finance,common,public,extensions',
  records: 'records,common,public,extensions',
  inventory: 'inventory,common,public,extensions',
  library: 'library,common,public,extensions',
  documents: 'documents,common,public,extensions',
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

function upsertEnv(path, updates) {
  const lines = existsSync(path) ? readFileSync(path, 'utf8').split(/\r?\n/) : []
  const seen = new Set()
  const next = lines.map((line) => {
    const t = line.trim()
    if (!t || t.startsWith('#') || !t.includes('=')) return line
    const i = t.indexOf('=')
    const key = t.slice(0, i).trim()
    if (!(key in updates)) return line
    seen.add(key)
    return `${key}=${updates[key]}`
  })
  for (const [key, val] of Object.entries(updates)) {
    if (!seen.has(key)) next.push(`${key}=${val}`)
  }
  writeFileSync(path, `${next.filter((l, idx) => !(l === '' && idx === next.length - 1)).join('\n')}\n`)
}

const platformEnv = {
  ...readEnvMap(resolve(root, '.env')),
  ...readEnvMap(resolve(root, 'apps/base-api/.env')),
}

const targetHost = process.env.CIS_DB_HOST || platformEnv.DB_HOST || '127.0.0.1'
const targetPort =
  process.env.CIS_DB_PORT || platformEnv.POSTGRES_HOST_PORT || platformEnv.DB_PORT || '5433'
const targetUser =
  process.env.CIS_DB_USER || platformEnv.POSTGRES_USER || platformEnv.DB_USER || 'wmsu'
const targetPassword =
  process.env.CIS_DB_PASSWORD ||
  platformEnv.POSTGRES_PASSWORD ||
  platformEnv.DB_PASSWORD ||
  'wmsu_dev_change_me'
const targetDatabase =
  process.env.CIS_DB_DATABASE ||
  platformEnv.CIS_DB_DATABASE ||
  platformEnv.POSTGRES_DB ||
  map.targetDatabase ||
  'wmsu_cis'
const targetSchema = step.targetSchema
const envPath = satelliteEnvByModule[moduleName]
const backupPath = `${envPath}.pre-cis`
const outDir = resolve(root, 'tmp/phase3-dumps')
mkdirSync(outDir, { recursive: true })
const stateFile = resolve(outDir, `${moduleName}-cutover-state.json`)
const container = process.env.WMSU_PG_CONTAINER || 'wmsu-cis-postgres'

if (!envPath || !existsSync(envPath)) {
  console.error(`Satellite .env missing for ${moduleName}: ${envPath}`)
  process.exit(1)
}

function run(cmd, args, opts = {}) {
  const result = spawnSync(cmd, args, { encoding: 'utf8', ...opts })
  if (result.error) throw result.error
  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout || `${cmd} failed`)
  }
  return result.stdout
}

function verifySchemaTables() {
  const sql = `SELECT count(*)::int FROM information_schema.tables WHERE table_schema='${targetSchema}' AND table_type='BASE TABLE'`
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
  return Number(String(out).trim() || '0')
}

function recordProgress(state) {
  writeFileSync(stateFile, JSON.stringify(state, null, 2))
  const progressPath = resolve(root, 'infrastructure/database/phase3-progress.json')
  let progress = { phase: 'phase3c-search-path-cutover', completedModules: [], cutoverModules: [] }
  if (existsSync(progressPath)) {
    try {
      progress = JSON.parse(readFileSync(progressPath, 'utf8'))
    } catch {
      // keep defaults
    }
  }
  const cutover = Array.isArray(progress.cutoverModules) ? progress.cutoverModules : []
  const without = cutover.filter((c) => c.module !== moduleName)
  if (state.status === 'cutover') {
    without.push({
      module: moduleName,
      targetSchema,
      targetDatabase,
      tableCount: state.tableCount,
      cutoverAt: state.cutoverAt,
      envPath,
      searchPath: state.searchPath,
      rollbackEnv: backupPath,
    })
  }
  progress.phase =
    without.length > 0 ? 'phase3c-search-path-cutover' : progress.phase || 'phase3b-module-restore'
  progress.cutoverModules = without
  progress.cutoverPendingModules = map.sources
    .map((s) => s.module)
    .filter((m) => !without.some((c) => c.module === m))
  if (progress.phase3bStatus !== 'module-restore-complete') {
    progress.phase3bStatus = 'module-restore-complete'
  }
  writeFileSync(progressPath, JSON.stringify(progress, null, 2))
}

const cisUpdates = {
  DB_HOST: targetHost,
  DB_PORT: String(targetPort),
  DB_USER: targetUser,
  DB_PASSWORD: targetPassword,
  DB_DATABASE: targetDatabase,
  DB_SCHEMA: targetSchema,
  DB_SSL: 'false',
}

const plan = {
  module: moduleName,
  mode: dryRun ? 'dry-run' : rollback ? 'rollback' : 'cutover',
  envPath,
  backupPath,
  cis: cisUpdates,
  searchPath: searchPathByModule[moduleName] || `${targetSchema},common,public,extensions`,
  targetSchema,
}

console.log(JSON.stringify(plan, null, 2))
if (dryRun) {
  console.log('Dry-run only.')
  process.exit(0)
}

try {
  if (rollback) {
    if (!existsSync(backupPath)) {
      throw new Error(`Missing rollback file: ${backupPath}`)
    }
    copyFileSync(backupPath, envPath)
    const state = {
      module: moduleName,
      status: 'rolled-back',
      rolledBackAt: new Date().toISOString(),
      envPath,
    }
    writeFileSync(stateFile, JSON.stringify(state, null, 2))
    const progressPath = resolve(root, 'infrastructure/database/phase3-progress.json')
    if (existsSync(progressPath)) {
      const progress = JSON.parse(readFileSync(progressPath, 'utf8'))
      progress.cutoverModules = (progress.cutoverModules || []).filter((c) => c.module !== moduleName)
      progress.cutoverPendingModules = map.sources
        .map((s) => s.module)
        .filter((m) => !(progress.cutoverModules || []).some((c) => c.module === m))
      writeFileSync(progressPath, JSON.stringify(progress, null, 2))
    }
    console.log(`Rolled back ${moduleName} .env from ${backupPath}`)
    process.exit(0)
  }

  const tables = verifySchemaTables()
  if (tables < 1) {
    throw new Error(`Refusing cutover: ${targetDatabase}.${targetSchema} has ${tables} tables`)
  }

  if (!existsSync(backupPath)) {
    copyFileSync(envPath, backupPath)
    console.log(`Saved pre-CIS .env → ${backupPath}`)
  } else {
    console.log(`Keeping existing backup ${backupPath}`)
  }

  upsertEnv(envPath, cisUpdates)

  const state = {
    module: moduleName,
    status: 'cutover',
    phase: 'phase3c-search-path-cutover',
    cutoverAt: new Date().toISOString(),
    target: {
      host: targetHost,
      port: Number(targetPort),
      database: targetDatabase,
      schema: targetSchema,
      user: targetUser,
    },
    searchPath: searchPathByModule[moduleName] || `${targetSchema},common,public,extensions`,
    tableCount: tables,
    envPath,
    backupPath,
    satelliteDbUntouched: true,
    note: 'App .env now points at wmsu_cis owned schema; satellite source DB left intact for rollback',
  }
  recordProgress(state)
  console.log(JSON.stringify(state, null, 2))
  console.log(
    `Phase 3c ${moduleName} cutover written. Restart ${step.engine} to use search_path=${state.searchPath}.`
  )
} catch (err) {
  console.error(String(err instanceof Error ? err.message : err))
  process.exit(1)
}
