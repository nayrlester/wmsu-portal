import { spawnSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const env = process.argv[2]
if (env !== 'staging' && env !== 'production') {
  console.error('Usage: node scripts/deploy/build.mjs staging|production')
  process.exit(1)
}

const root = path.resolve(fileURLToPath(new URL('.', import.meta.url)), '../..')
const identityRoot = path.resolve(root, '../wmsu-api')

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

console.log(`Building WMSU CIS for ${env}…`)

run('Platform (packages + apps)', 'pnpm', ['run', 'build'])
run('University Identity (wmsu-api)', 'npm', ['run', 'build'], identityRoot)

console.log(`\nBuild complete (${env}). Artifacts under each app’s build/dist output.`)
