import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const baseApi = join(root, 'apps', 'base-api')
const specs = [
  'tests/functional/ulmis_foundation.spec.ts',
  'tests/functional/ulmis_catalog.spec.ts',
  'tests/functional/ulmis_circulation.spec.ts',
  'tests/functional/ulmis_acquisitions.spec.ts',
  'tests/functional/ulmis_reports.spec.ts',
  'tests/functional/library_inprocess.spec.ts',
]

const env = { ...process.env, LIBRARY_TEST_BOOTSTRAP: '1', AUTH_MODE: 'local' }
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
