import { existsSync } from 'node:fs'
import { spawnSync } from 'node:child_process'

const entry = existsSync('bin/server.js') ? 'bin/server.js' : 'build/bin/server.js'

if (!existsSync(entry)) {
  console.error(
    `Missing ${entry}. Run "pnpm run build" (or deploy with the Dockerfile so the build output is flattened).`
  )
  process.exit(1)
}

const result = spawnSync('node', [entry], { stdio: 'inherit' })
process.exit(result.status ?? 1)
