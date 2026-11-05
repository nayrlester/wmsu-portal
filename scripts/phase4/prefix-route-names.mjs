import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const MODULES = path.resolve(__dirname, '../../apps/base-api/app/modules')

function walk(dir) {
  const out = []
  if (!fs.existsSync(dir)) return out
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name)
    if (e.isDirectory()) out.push(...walk(full))
    else if (e.name.endsWith('.ts')) out.push(full)
  }
  return out
}

const MODULES_SPEC = [
  'enrollment',
  'finance',
  'records',
  'library',
  'documents',
  'inventory',
]

for (const mod of MODULES_SPEC) {
  const routesRoot = path.join(MODULES, mod, 'routes')
  for (const file of walk(routesRoot)) {
    let content = fs.readFileSync(file, 'utf8')
    const original = content
    const re = new RegExp(
      `\\.prefix\\(\\s*(['"\`])\\/api\\/v1\\/${mod}\\1\\s*\\)(?!\\s*\\.as\\()`,
      'g'
    )
    content = content.replace(re, `.prefix('/api/v1/${mod}').as('${mod}')`)
    const reInternal = new RegExp(
      `\\.prefix\\(\\s*(['"\`])\\/api\\/v1\\/${mod}\\/internal\\1\\s*\\)(?!\\s*\\.as\\()`,
      'g'
    )
    content = content.replace(
      reInternal,
      `.prefix('/api/v1/${mod}/internal').as('${mod}.internal')`
    )
    if (content !== original) {
      fs.writeFileSync(file, content)
      console.log('updated', path.relative(MODULES, file))
    }
  }
}

fs.writeFileSync(
  path.join(MODULES, 'documents/routes/routes/webhooks/pandadoc.ts'),
  `import router from '@adonisjs/core/services/router'

const PandadocWebhooksController = () => import('#modules/documents/controllers/pandadoc_webhooks_controller')

export function registerPandadocWebhookRoutes() {
  router
    .post('/api/v1/documents/webhooks/pandadoc', [PandadocWebhooksController, 'handle'])
    .as('documents.webhooks.pandadoc')
}
`
)

console.log('done')
