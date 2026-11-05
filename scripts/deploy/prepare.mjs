import { spawnSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const env = process.argv[2]
if (env !== 'staging' && env !== 'production') {
  console.error('Usage: node scripts/deploy/prepare.mjs staging|production')
  process.exit(1)
}

const root = path.resolve(fileURLToPath(new URL('.', import.meta.url)), '../..')

process.env.WMSU_DEPLOY_ENV = env
process.env.NODE_ENV = 'production'

function run(label, command, args, cwd = root) {
  console.log(`\n→ ${label}`)
  const result = spawnSync(command, args, {
    cwd,
    stdio: 'inherit',
    shell: process.platform === 'win32',
    env: process.env,
  })
  if (result.status !== 0) {
    process.exit(result.status ?? 1)
  }
}

console.log(`Preparing WMSU CIS deployment (${env})…`)

run('Lint', 'pnpm', ['run', 'lint'])
run('Typecheck', 'pnpm', ['run', 'typecheck'])
run('Production build', 'node', ['scripts/deploy/build.mjs', env])

console.log('\n--- Post-build checklist ---')
console.log('1. Host env: copy .env.example → .env on server (never commit secrets).')
console.log('2. Data plane: docker compose -f infrastructure/docker/docker-compose.yml up -d')
console.log('3. Migrations: pnpm run db:migrate  &&  npm run db:migrate --prefix ../wmsu-api')
console.log('4. Processes: Base API (:3500), worker, Identity (:3411), static hosting for Vite apps.')
console.log('5. Smoke: pnpm run verify  (point API_BASE_URL / WEB_PORTAL_URL at deployed URLs)')

if (env === 'staging') {
  console.log('\nStaging: use per-app VITE_* URLs (see apps/*-web/.env.staging.example where present).')
}

if (env === 'production') {
  console.log('\nProduction: TLS, backups, rate limits, and university sign-off before go-live.')
}

console.log(`\nDeploy prepare finished (${env}).`)
