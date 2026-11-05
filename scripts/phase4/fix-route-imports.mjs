import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const MODULES = path.resolve(__dirname, '../../apps/base-api/app/modules')
const NAMES = ['enrollment', 'finance', 'records', 'library', 'documents', 'inventory']

function walk(dir) {
  const out = []
  if (!fs.existsSync(dir)) return out
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name)
    if (e.isDirectory()) out.push(...walk(full))
    else if (/\.(ts|js)$/.test(e.name)) out.push(full)
  }
  return out
}

for (const name of NAMES) {
  const root = path.join(MODULES, name)
  for (const file of walk(root)) {
    let content = fs.readFileSync(file, 'utf8')
    const original = content

    content = content.replace(
      /(['"])#start\/routes\//g,
      `$1#modules/${name}/routes/routes/`
    )
    content = content.replace(
      /(['"])#start\/routes(['"])/g,
      `$1#modules/${name}/routes/routes$2`
    )

    content = content.replace(
      /router\.get\(\s*['"]\/health['"]/g,
      `router.get('/api/v1/${name}/_engine_health'`
    )

    if (content !== original) {
      fs.writeFileSync(file, content)
      console.log('fixed', path.relative(MODULES, file))
    }
  }
}

console.log('done')
