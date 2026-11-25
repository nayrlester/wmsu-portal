import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const srcDir = path.join(root, '../wmsu-document/api/tests/functional')
const dstDir = path.join(root, 'apps/base-api/tests/functional')
const reps = [
  ['../helpers/database.js', '../helpers/udms_test_database.js'],
  ['/api/v1/auth/login', '/api/v1/documents/auth/login'],
  ['/api/v1/udms/', '/api/v1/documents/udms/'],
  ['/api/v1/account/', '/api/v1/documents/account/'],
  ['#models/user', '#modules/documents/models/user'],
  ['#models/document', '#modules/documents/models/document'],
  ['#domain/enums/index', '#modules/documents/domain/enums/index'],
]
const files = fs.readdirSync(srcDir).filter((f) => f.startsWith('udms_'))

for (const f of files) {
  let c = fs.readFileSync(path.join(srcDir, f), 'utf8')
  for (const [a, b] of reps) c = c.split(a).join(b)
  fs.writeFileSync(path.join(dstDir, f), c)
  console.log('wrote', f)
}
