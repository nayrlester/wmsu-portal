import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const baseApi = join(root, 'apps', 'base-api')
const specs = [
  'tests/functional/udms_foundation.spec.ts',
  'tests/functional/udms_repository.spec.ts',
  'tests/functional/udms_workflow.spec.ts',
  'tests/functional/udms_lifecycle.spec.ts',
  'tests/functional/udms_reports.spec.ts',
  'tests/functional/udms_acceptance.spec.ts',
  'tests/functional/documents_inprocess.spec.ts',
]

const env = {
  ...process.env,
  AUTH_MODE: 'local',
  SERVICE_API_KEY: process.env.SERVICE_API_KEY ?? 'dev-service-api-change-me',
  FRONTEND_URL: process.env.FRONTEND_URL ?? 'http://127.0.0.1:5185',
  PUBLIC_TRACK_BASE_URL: process.env.PUBLIC_TRACK_BASE_URL ?? 'http://127.0.0.1:5185',
}
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
