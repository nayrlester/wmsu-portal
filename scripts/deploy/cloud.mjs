import { spawnSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { RAILWAY_SERVICES, VERCEL_WEB_APPS } from './vercel-apps.mjs'

const root = path.resolve(fileURLToPath(new URL('.', import.meta.url)), '../..')
const env = process.argv[2]
const push = process.argv.includes('--push')
const skipPrepare = process.argv.includes('--skip-prepare')
const vercelOnly = process.argv.includes('--vercel-only')
const railwayOnly = process.argv.includes('--railway-only')
const seedPh = process.argv.includes('--seed-ph')

if (env !== 'staging' && env !== 'production') {
  console.error(
    'Usage: node scripts/deploy/cloud.mjs staging|production [--push] [--skip-prepare] [--vercel-only] [--railway-only] [--seed-ph]'
  )
  process.exit(1)
}

function hasCli(name) {
  const probe = spawnSync(name, ['--version'], { shell: true, stdio: 'ignore' })
  return probe.status === 0
}

function run(label, command, args, cwd = root) {
  console.log(`\n→ ${label}`)
  const result = spawnSync(command, args, {
    cwd,
    stdio: 'inherit',
    shell: process.platform === 'win32',
    env: { ...process.env, WMSU_DEPLOY_ENV: env },
  })
  if (result.status !== 0) {
    process.exit(result.status ?? 1)
  }
}

console.log(`WMSU CIS cloud deploy (${env})${push ? ' — LIVE PUSH' : ' — dry run'}`)

if (!skipPrepare) {
  run('Prepare artifacts', 'node', ['scripts/deploy/prepare.mjs', env])
}

if (!push) {
  console.log('\nDry run complete. Re-run with --push after linking Railway + Vercel projects.')
  console.log('  pnpm run deploy:cloud:staging -- --push')
  console.log('\nRailway services:')
  for (const svc of RAILWAY_SERVICES) {
    console.log(`  - ${svc.id} (${svc.repo}) → ${svc.config}`)
  }
  console.log('\nVercel projects (Root Directory = apps/<name>):')
  for (const app of VERCEL_WEB_APPS) {
    console.log(`  - ${app.slug} → ${app.dir} (pnpm filter ${app.filter})`)
  }
  process.exit(0)
}

if (!vercelOnly) {
  if (!hasCli('railway')) {
    console.error('Railway CLI missing. Install: npm i -g @railway/cli && railway login')
    process.exit(1)
  }

  const platformServices = RAILWAY_SERVICES.filter((s) => s.repo === 'wmsu-platform')
  for (const svc of platformServices) {
    const envKey = `RAILWAY_SERVICE_${svc.id.replace(/-/g, '_').toUpperCase()}`
    const serviceId = process.env[envKey]
    if (!serviceId) {
      console.warn(`Skip Railway ${svc.id}: set ${envKey} to the service ID from Railway dashboard.`)
      continue
    }
    run(`Railway ${svc.id}`, 'railway', ['redeploy', '--service', serviceId, '-y'])
  }

  const identity = RAILWAY_SERVICES.find((s) => s.id === 'identity-api')
  const identityServiceId = process.env.RAILWAY_SERVICE_IDENTITY_API
  if (identity && identityServiceId) {
    const identityRoot = path.resolve(root, identity.repo)
    run('Railway identity-api', 'railway', ['redeploy', '--service', identityServiceId, '-y'], identityRoot)
  } else if (identity) {
    console.warn('Skip identity-api: set RAILWAY_SERVICE_IDENTITY_API')
  }
}

if (!railwayOnly) {
  if (!hasCli('vercel')) {
    console.error('Vercel CLI missing. Install: npm i -g vercel && vercel login')
    process.exit(1)
  }

  const vercelTarget = env === 'production' ? '--prod' : ''
  for (const app of VERCEL_WEB_APPS) {
    const appRoot = path.join(root, app.dir)
    run(`Vercel ${app.slug}`, 'vercel', ['deploy', vercelTarget, '--yes'].filter(Boolean), appRoot)
  }
}

if (seedPh) {
  if (env !== 'production') {
    console.warn('Skip --seed-ph: only wired for production Base API today.')
  } else {
    const seedArgs = ['scripts/ph-university-reset-and-seed.mjs', '--prod']
    if (!process.env.RAILWAY_PUBLIC_DATABASE_URL?.trim()) {
      seedArgs.push('--seed-only')
      console.warn(
        'RAILWAY_PUBLIC_DATABASE_URL unset — running PH seed API-only (no SQL cleanup).'
      )
    }
    run('PH university baseline (prod)', 'node', seedArgs)
  }
}

console.log(`\nCloud deploy finished (${env}).`)
