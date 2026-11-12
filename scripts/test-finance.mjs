import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const baseApi = join(root, 'apps', 'base-api')
const specs = [
  'tests/functional/ufms_package_d.spec.ts',
  'tests/functional/ufms_package_e.spec.ts',
]

const env = { ...process.env, FINANCE_TEST_BOOTSTRAP: '1', AUTH_MODE: 'local', SERVICE_API_KEY: process.env.SERVICE_API_KEY ?? 'dev-service-api-change-me' }
let failed = 0

for (const spec of specs) {
  const result = spawnSync('node', ['ace', 'test', '--files', spec], {
    cwd: baseApi,
    env,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  })
  if (result.status !== 0) failed++
}

if (failed > 0) {
  process.exit(1)
}
