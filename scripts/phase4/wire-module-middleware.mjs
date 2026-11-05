import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const MODULES = path.resolve(__dirname, '../../apps/base-api/app/modules')

const MODULE_NAMES = ['enrollment', 'finance', 'records', 'library', 'documents', 'inventory']

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

function middlewareKeys(moduleName) {
  const dir = path.join(MODULES, moduleName, 'middleware')
  if (!fs.existsSync(dir)) return []
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('_middleware.ts'))
    .map((f) => f.replace(/_middleware\.ts$/, ''))
}

function toCamel(key) {
  return key.replace(/_([a-z])/g, (_, c) => c.toUpperCase())
}

for (const name of MODULE_NAMES) {
  const keys = middlewareKeys(name)
  if (!keys.length) {
    console.warn(`no middleware for ${name}`)
    continue
  }

  const entries = keys.map((k) => {
    const camel = toCamel(k)
    const named = `${name}_${camel}`
    return { k, camel, named, file: `${k}_middleware` }
  })

  const registry = `import router from '@adonisjs/core/services/router'

export const middleware = router.named({
${entries
  .map(
    (e) =>
      `  ${e.named}: () => import('#modules/${name}/middleware/${e.file}'),`
  )
  .join('\n')}
})

export const mw = {
${entries.map((e) => `  ${e.camel}: middleware.${e.named},`).join('\n')}
}
`

  fs.writeFileSync(path.join(MODULES, name, 'middleware_registry.ts'), registry)

  const routesDir = path.join(MODULES, name, 'routes')
  for (const file of walk(routesDir)) {
    let content = fs.readFileSync(file, 'utf8')
    if (!content.includes("from '#start/kernel'") && !content.includes('from "#start/kernel"')) {
      continue
    }
    content = content.replace(
      /import\s+\{\s*middleware\s*\}\s+from\s+['"]#start\/kernel['"]/g,
      `import { mw as middleware } from '#modules/${name}/middleware_registry'`
    )
    fs.writeFileSync(file, content)
  }

  console.log(`wired middleware registry: ${name} (${entries.length} keys)`)
}
