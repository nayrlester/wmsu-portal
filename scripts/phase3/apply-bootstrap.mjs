import { readFileSync, existsSync, writeFileSync, unlinkSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '../..')

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

const host = process.env.CIS_DB_HOST || process.env.DB_HOST || '127.0.0.1'
const port = process.env.CIS_DB_PORT || process.env.DB_PORT || '5433'
const user = process.env.CIS_DB_USER || process.env.DB_USER || 'wmsu'
const password = process.env.CIS_DB_PASSWORD || process.env.DB_PASSWORD || 'wmsu_dev_change_me'
const database =
  process.env.CIS_DB_DATABASE || process.env.POSTGRES_DB || 'wmsu_cis'
const container = process.env.WMSU_PG_CONTAINER || 'wmsu-cis-postgres'

const files = [
  resolve(root, 'infrastructure/database/01_schemas.sql'),
  resolve(root, 'infrastructure/database/02_roles.sql'),
]

function runViaDocker(sqlFile) {
  const remote = `/tmp/${sqlFile.split(/[/\\]/).pop()}`
  const cp = spawnSync('docker', ['cp', sqlFile, `${container}:${remote}`], {
    encoding: 'utf8',
  })
  if (cp.status !== 0) {
    throw new Error(cp.stderr || cp.stdout || `docker cp failed for ${sqlFile}`)
  }
  const exec = spawnSync(
    'docker',
    ['exec', container, 'psql', '-U', user, '-d', database, '-v', 'ON_ERROR_STOP=1', '-f', remote],
    { encoding: 'utf8' }
  )
  if (exec.status !== 0) {
    throw new Error(exec.stderr || exec.stdout || `docker exec psql failed for ${sqlFile}`)
  }
  return exec.stdout
}

function runViaLocalPsql(sqlFile) {
  const result = spawnSync(
    'psql',
    ['-h', host, '-p', String(port), '-U', user, '-d', database, '-v', 'ON_ERROR_STOP=1', '-f', sqlFile],
    { encoding: 'utf8', env: { ...process.env, PGPASSWORD: password } }
  )
  if (result.error) throw result.error
  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout || `psql failed on ${sqlFile}`)
  }
  return result.stdout
}

function applySql(sqlFile) {
  const inspect = spawnSync('docker', ['inspect', container], { encoding: 'utf8' })
  if (inspect.status === 0) return runViaDocker(sqlFile)
  return runViaLocalPsql(sqlFile)
}

console.log(`Applying Phase 3 bootstrap to ${user}@${host}:${port}/${database} (container=${container})`)
for (const file of files) {
  console.log(`→ ${file}`)
  const out = applySql(file)
  if (out.trim()) console.log(out.trim())
}

const appPassword = process.env.WMSU_APP_ROLE_PASSWORD || password
const roles = [
  'wmsu_migrator',
  'wmsu_common_app',
  'wmsu_enrollment_app',
  'wmsu_records_app',
  'wmsu_finance_app',
  'wmsu_library_app',
  'wmsu_inventory_app',
  'wmsu_documents_app',
]
const alterSql = roles
  .map((r) => `ALTER ROLE ${r} PASSWORD '${appPassword.replace(/'/g, "''")}';`)
  .join('\n')
const alterFile = resolve(root, 'infrastructure/database/.tmp_set_passwords.sql')
writeFileSync(alterFile, alterSql)
try {
  applySql(alterFile)
  console.log('Role passwords set from WMSU_APP_ROLE_PASSWORD / DB_PASSWORD (dev only).')
} finally {
  unlinkSync(alterFile)
}

console.log('Phase 3 bootstrap applied (schemas + roles).')
