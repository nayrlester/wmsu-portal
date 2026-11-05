import { readFileSync, existsSync, mkdirSync, writeFileSync, unlinkSync } from 'node:fs'
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
const dumpOnly = process.argv.includes('--dump-only')
const restoreOnly = process.argv.includes('--restore-only')
const dryRun = process.argv.includes('--dry-run')

if (!moduleName) {
  console.error(
    'Usage: node scripts/phase3/restore-module.mjs --module=enrollment [--dump-only|--restore-only|--dry-run]'
  )
  process.exit(1)
}

const step = map.sources.find((s) => s.module === moduleName)
if (!step) {
  console.error(`Unknown module: ${moduleName}`)
  process.exit(1)
}

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

const satelliteEnvByModule = {
  common: resolve(root, '../wmsu-api/apps/api/.env'),
  enrollment: resolve(root, '../wmsu-enrollment/apps/api/.env'),
  finance: resolve(root, '../wmsu-finance/apps/api/.env'),
  records: resolve(root, '../wmsu-records/apps/api/.env'),
  inventory: resolve(root, '../wmsu-inventory/apps/api/.env'),
  library: resolve(root, '../wmsu-library/apps/api/.env'),
  documents: resolve(root, '../wmsu-document/api/.env'),
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
const satEnvPath = satelliteEnvByModule[moduleName]
const satEnv = satEnvPath ? readEnvMap(satEnvPath) : {}

const sourceHost =
  process.env.SOURCE_PGHOST || satEnv.DB_HOST || '127.0.0.1'
const sourcePort =
  process.env.SOURCE_PGPORT || satEnv.DB_PORT || String(step.defaultPort || 5432)
const sourceUser = process.env.SOURCE_PGUSER || satEnv.DB_USER || 'uims'
const sourcePassword = process.env.SOURCE_PGPASSWORD || satEnv.DB_PASSWORD || ''
const sourceDatabase =
  process.env.SOURCE_PGDATABASE || satEnv.DB_DATABASE || step.sourceDatabase
const sourceSchema =
  process.env.SOURCE_PGSCHEMA || satEnv.DB_SCHEMA || step.sourceSchema

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

const outDir = resolve(root, 'tmp/phase3-dumps')
mkdirSync(outDir, { recursive: true })
const dumpFile = resolve(outDir, `${moduleName}_${sourceSchema}.sql`)
const rewrittenFile = resolve(outDir, `${moduleName}_to_${targetSchema}.sql`)
const stateFile = resolve(outDir, `${moduleName}-restore-state.json`)

function run(cmd, args, env = process.env) {
  const result = spawnSync(cmd, args, { encoding: 'utf8', env })
  if (result.error) throw result.error
  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout || `${cmd} failed`)
  }
  return result.stdout
}

function rewriteDump(sql) {
  const quotedSource = `"${sourceSchema}"`
  const quotedTarget = `"${targetSchema}"`
  let out = sql
  out = out.replace(/^\\restrict[^\n]*\n/gm, '')
  out = out.replace(/^\\unrestrict[^\n]*\n/gm, '')
  out = out.replace(
    new RegExp(`CREATE SCHEMA IF NOT EXISTS ${quotedSource};`, 'g'),
    `-- CREATE SCHEMA IF NOT EXISTS skipped (target ${quotedTarget} already provisioned)`
  )
  out = out.replace(
    new RegExp(`CREATE SCHEMA IF NOT EXISTS ${sourceSchema};`, 'g'),
    `-- CREATE SCHEMA IF NOT EXISTS skipped (target ${targetSchema} already provisioned)`
  )
  out = out.replace(
    new RegExp(`CREATE SCHEMA ${quotedSource};`, 'g'),
    `-- CREATE SCHEMA skipped (target ${quotedTarget} already provisioned)`
  )
  out = out.replace(
    new RegExp(`CREATE SCHEMA ${sourceSchema};`, 'g'),
    `-- CREATE SCHEMA skipped (target ${targetSchema} already provisioned)`
  )
  out = out.replaceAll(`${quotedSource}.`, `${quotedTarget}.`)
  out = out.replaceAll(`${sourceSchema}.`, `${targetSchema}.`)
  out = out.replaceAll(`Name: ${sourceSchema};`, `Name: ${targetSchema};`)
  out = out.replaceAll(`Schema: ${sourceSchema};`, `Schema: ${targetSchema};`)
  for (const op of ['gin_trgm_ops', 'gist_trgm_ops']) {
    out = out.replaceAll(`${quotedTarget}.${op}`, `extensions.${op}`)
    out = out.replaceAll(`${targetSchema}.${op}`, `extensions.${op}`)
    out = out.replaceAll(`public.${op}`, `extensions.${op}`)
  }
  return out
}

function prepareTargetSchema() {
  const sql = [
    `DROP SCHEMA IF EXISTS ${targetSchema} CASCADE;`,
    `CREATE SCHEMA ${targetSchema};`,
    `GRANT USAGE ON SCHEMA ${targetSchema} TO wmsu_${moduleName}_app, wmsu_migrator;`,
    `ALTER DEFAULT PRIVILEGES IN SCHEMA ${targetSchema} GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO wmsu_${moduleName}_app;`,
  ].join('\n')
  const prepareFile = resolve(outDir, `${moduleName}_prepare_${targetSchema}.sql`)
  writeFileSync(prepareFile, sql)
  const remote = `/tmp/${moduleName}_prepare_${targetSchema}.sql`
  console.log(`Preparing target schema ${targetSchema} (drop+create)…`)
  const inspect = spawnSync('docker', ['inspect', container], { encoding: 'utf8' })
  if (inspect.status === 0) {
    run('docker', ['cp', prepareFile, `${container}:${remote}`])
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
  } else {
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
        prepareFile,
      ],
      { ...process.env, PGPASSWORD: targetPassword }
    )
  }
}

function sourceDumpEnv() {
  const isLocal =
    sourceHost === '127.0.0.1' ||
    sourceHost === 'localhost' ||
    sourceHost === '::1'
  const ssl =
    process.env.SOURCE_PGSSLMODE ||
    (isLocal
      ? 'disable'
      : String(satEnv.DB_SSL || '').toLowerCase() === 'true' ||
          /supabase\.com$/i.test(sourceHost)
        ? 'require'
        : undefined)
  return {
    ...process.env,
    PGPASSWORD: sourcePassword,
    ...(ssl ? { PGSSLMODE: ssl } : {}),
  }
}

function dumpSource() {
  const portsToTry = [String(sourcePort)]
  if (String(sourcePort) === '6543') portsToTry.push('5432')

  let lastError = null
  for (const port of portsToTry) {
    console.log(
      `Dumping ${moduleName}: ${sourceUser}@${sourceHost}:${port}/${sourceDatabase} schema=${sourceSchema}`
    )
    try {
      run(
        'pg_dump',
        [
          '-h',
          sourceHost,
          '-p',
          port,
          '-U',
          sourceUser,
          '-d',
          sourceDatabase,
          `--schema=${sourceSchema}`,
          '--no-owner',
          '--no-privileges',
          '-f',
          dumpFile,
        ],
        sourceDumpEnv()
      )
      console.log(`Dump written: ${dumpFile}`)
      return
    } catch (err) {
      lastError = err
      console.error(`pg_dump failed on port ${port}: ${err instanceof Error ? err.message : err}`)
    }
  }
  throw lastError || new Error('pg_dump failed')
}

function rewriteAndStage() {
  if (!existsSync(dumpFile)) throw new Error(`Missing dump: ${dumpFile}`)
  const rewritten = rewriteDump(readFileSync(dumpFile, 'utf8'))
  writeFileSync(rewrittenFile, rewritten)
  console.log(`Rewritten dump: ${rewrittenFile} (${sourceSchema} → ${targetSchema})`)
}

function restoreTarget() {
  if (!existsSync(rewrittenFile)) throw new Error(`Missing rewritten dump: ${rewrittenFile}`)
  const remote = `/tmp/${moduleName}_to_${targetSchema}.sql`
  console.log(`Restoring into ${targetUser}@${targetHost}:${targetPort}/${targetDatabase} schema=${targetSchema}`)

  const inspect = spawnSync('docker', ['inspect', container], { encoding: 'utf8' })
  if (inspect.status === 0) {
    run('docker', ['cp', rewrittenFile, `${container}:${remote}`])
    run('docker', [
      'exec',
      '-e',
      `PGPASSWORD=${targetPassword}`,
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
  } else {
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
        rewrittenFile,
      ],
      { ...process.env, PGPASSWORD: targetPassword }
    )
  }
  console.log('Restore complete.')
}

function verifyTarget() {
  const sql =
    `SELECT count(*)::int AS tables FROM information_schema.tables WHERE table_schema='${targetSchema}';`
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
      { ...process.env, PGPASSWORD: targetPassword }
    )
  }
  const tables = Number(String(out).trim() || '0')
  const state = {
    module: moduleName,
    phase: 'phase3b-module-restore',
    source: {
      host: sourceHost,
      port: Number(sourcePort),
      database: sourceDatabase,
      schema: sourceSchema,
    },
    target: {
      host: targetHost,
      port: Number(targetPort),
      database: targetDatabase,
      schema: targetSchema,
      tableCount: tables,
    },
    dumpFile,
    rewrittenFile,
    restoredAt: new Date().toISOString(),
    satelliteUntouched: true,
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
    sourceDatabase,
    sourceSchema,
    tableCount: tables,
    restoredAt: state.restoredAt,
    satelliteUntouched: true,
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
  sourceSchema,
  targetSchema,
  sourceDatabase,
  targetDatabase,
  dumpFile,
  rewrittenFile,
  mode: dryRun ? 'dry-run' : dumpOnly ? 'dump-only' : restoreOnly ? 'restore-only' : 'dump+rewrite+restore',
}

console.log(JSON.stringify(plan, null, 2))
if (dryRun) {
  console.log('Dry-run only.')
  process.exit(0)
}

try {
  if (!restoreOnly) dumpSource()
  if (!dumpOnly) {
    rewriteAndStage()
    prepareTargetSchema()
    restoreTarget()
    verifyTarget()
  } else {
    console.log('Dump-only complete.')
  }
  console.log(`Phase 3b ${moduleName} finished. Satellite DB left intact.`)
} catch (err) {
  console.error(String(err instanceof Error ? err.message : err))
  process.exit(1)
}
