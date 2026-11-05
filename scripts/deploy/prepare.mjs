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
console.log('Railway: cis-base-api + cis-worker + identity-api — see deploy/railway/README.md')
console.log('Vercel: one project per apps/*-web — see deploy/vercel/README.md')
console.log('Env templates: deploy/env/*.example')
console.log('Push to cloud: pnpm run deploy:cloud:staging -- --push  (needs Railway + Vercel CLI and service IDs)')
console.log('1. Railway variables: base-api + worker + Identity (CORS + PLATFORM_* + VITE_* on Vercel)')
console.log('2. Migrations run on deploy (Base API + Identity preDeployCommand); seed staging manually if needed')
console.log('3. Smoke: pnpm run verify with API_BASE_URL / WEB_PORTAL_URL set to deployed URLs')

if (env === 'staging') {
  console.log('\nStaging: use per-app VITE_* URLs (see apps/*-web/.env.staging.example where present).')
}

if (env === 'production') {
  console.log('\nProduction: TLS, backups, rate limits, and university sign-off before go-live.')
}

console.log(`\nDeploy prepare finished (${env}).`)
