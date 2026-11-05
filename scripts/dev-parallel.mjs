import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const scripts = process.argv.slice(2).filter(Boolean)

if (scripts.length === 0) {
  console.error('Usage: node scripts/dev-parallel.mjs <pnpm-script> [...]')
  process.exit(1)
}

const pnpm = process.platform === 'win32' ? 'pnpm' : 'pnpm'
const children = []

function start(name) {
  const child = spawn(pnpm, ['-w', 'run', name], {
    cwd: root,
    stdio: 'inherit',
    env: process.env,
    shell: true,
  })
  children.push(child)
  child.on('exit', (code) => {
    if (code !== 0 && code !== null) {
      console.error(`\n[dev] "${name}" exited with code ${code}\n`)
      for (const other of children) {
        if (other !== child && !other.killed) other.kill()
      }
      process.exit(code)
    }
  })
}

for (const name of scripts) start(name)

function shutdown() {
  for (const child of children) {
    if (!child.killed) child.kill('SIGINT')
  }
  process.exit(0)
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
