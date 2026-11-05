import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PLATFORM = path.resolve(__dirname, '../..')
const WMSU = path.resolve(PLATFORM, '..')
const BASE_API = path.join(PLATFORM, 'apps/base-api')
const MODULES = path.join(BASE_API, 'app/modules')

const ALIASES = [
  'controllers',
  'models',
  'services',
  'validators',
  'middleware',
  'domain',
  'helpers',
  'exceptions',
  'mails',
  'policies',
  'abilities',
  'events',
  'listeners',
]

const MODULES_SPEC = [
  {
    name: 'enrollment',
    prefix: 'enrollment',
    apiRoot: path.join(WMSU, 'wmsu-enrollment/apps/api'),
    webRoot: path.join(WMSU, 'wmsu-enrollment/apps/web'),
    webApp: 'enrollment-web',
    webPort: 5180,
    routesRel: 'start/routes',
    schemaDefault: 'enrollment',
  },
  {
    name: 'finance',
    prefix: 'finance',
    apiRoot: path.join(WMSU, 'wmsu-finance/apps/api'),
    webRoot: path.join(WMSU, 'wmsu-finance/apps/web'),
    webApp: 'finance-web',
    webPort: 5182,
    routesRel: 'start/routes',
    schemaDefault: 'finance',
  },
  {
    name: 'records',
    prefix: 'records',
    apiRoot: path.join(WMSU, 'wmsu-records/apps/api'),
    webRoot: path.join(WMSU, 'wmsu-records/apps/web'),
    webApp: 'records-web',
    webPort: 5181,
    routesRel: 'start/routes',
    schemaDefault: 'records',
  },
  {
    name: 'library',
    prefix: 'library',
    apiRoot: path.join(WMSU, 'wmsu-library/apps/api'),
    webRoot: path.join(WMSU, 'wmsu-library/apps/web'),
    webApp: 'library-web',
    webPort: 5183,
    routesRel: 'start',
    schemaDefault: 'library',
    extraWebs: [
      {
        src: path.join(WMSU, 'wmsu-library/apps/opac'),
        dest: 'library-opac-web',
        port: 5186,
      },
      {
        src: path.join(WMSU, 'wmsu-library/apps/kiosk'),
        dest: 'library-kiosk-web',
        port: 5187,
      },
    ],
  },
  {
    name: 'documents',
    prefix: 'documents',
    apiRoot: path.join(WMSU, 'wmsu-document/api'),
    webRoot: path.join(WMSU, 'wmsu-document/web'),
    webApp: 'document-web',
    webPort: 5185,
    routesRel: 'start',
    schemaDefault: 'documents',
  },
  {
    name: 'inventory',
    prefix: 'inventory',
    apiRoot: path.join(WMSU, 'wmsu-inventory/apps/api'),
    webRoot: path.join(WMSU, 'wmsu-inventory/apps/web'),
    webApp: 'inventory-web',
    webPort: 5184,
    routesRel: 'start/routes',
    schemaDefault: 'inventory',
  },
]

const SKIP_DIR = new Set([
  'node_modules',
  '.adonisjs',
  'tmp',
  'build',
  'dist',
  'coverage',
  'playwright-report',
  'test-results',
  '.git',
])

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true })
}

function rmrf(target) {
  if (fs.existsSync(target)) fs.rmSync(target, { recursive: true, force: true })
}

function copyDir(src, dest) {
  if (!fs.existsSync(src)) return false
  ensureDir(dest)
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    if (SKIP_DIR.has(entry.name)) continue
    const from = path.join(src, entry.name)
    const to = path.join(dest, entry.name)
    if (entry.isDirectory()) copyDir(from, to)
    else {
      ensureDir(path.dirname(to))
      fs.copyFileSync(from, to)
    }
  }
  return true
}

function rewriteImports(content, moduleName) {
  let out = content
  for (const alias of ALIASES) {
    const re = new RegExp(`(['"])#${alias}/`, 'g')
    out = out.replace(re, `$1#modules/${moduleName}/${alias}/`)
  }
  out = out.replace(/(['"])#database\//g, `$1#modules/${moduleName}/database/`)
  out = out.replace(/(['"])#commands\//g, `$1#modules/${moduleName}/commands/`)
  out = out.replace(/(['"])#providers\//g, `$1#modules/${moduleName}/providers/`)
  return out
}

function rewriteRoutePrefixes(content, prefix) {
  return content
    .replace(/\.prefix\(\s*['"]\/api\/v1\/internal['"]\s*\)/g, `.prefix('/api/v1/${prefix}/internal')`)
    .replace(/\.prefix\(\s*['"]\/api\/v1['"]\s*\)/g, `.prefix('/api/v1/${prefix}')`)
    .replace(
      /router\.group\(\(\)\s*=>\s*\{[\s\S]*?\}\)\s*\n\s*\.prefix\(\s*['"]\/api\/v1/g,
      (m) => m
    )
}

function walkFiles(dir, exts = ['.ts', '.js', '.tsx', '.jsx']) {
  const out = []
  if (!fs.existsSync(dir)) return out
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIR.has(entry.name)) continue
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) out.push(...walkFiles(full, exts))
    else if (exts.includes(path.extname(entry.name))) out.push(full)
  }
  return out
}

function absorbApi(mod) {
  const dest = path.join(MODULES, mod.name)
  ensureDir(dest)

  const keepOwner = path.join(dest, 'OWNER.md')
  const ownerBackup = fs.existsSync(keepOwner) ? fs.readFileSync(keepOwner, 'utf8') : null

  for (const folder of [
    'controllers',
    'models',
    'services',
    'validators',
    'middleware',
    'domain',
    'helpers',
    'exceptions',
    'mails',
    'policies',
    'abilities',
    'events',
    'listeners',
  ]) {
    const src = path.join(mod.apiRoot, 'app', folder)
    const target = path.join(dest, folder)
    if (fs.existsSync(target)) rmrf(target)
    copyDir(src, target)
  }

  for (const folder of ['database', 'commands', 'providers', 'docs']) {
    const src = path.join(mod.apiRoot, folder)
    if (!fs.existsSync(src)) continue
    const target = path.join(dest, folder)
    if (fs.existsSync(target)) rmrf(target)
    copyDir(src, target)
  }

  const routesSrc = path.join(mod.apiRoot, mod.routesRel)
  const routesDest = path.join(dest, 'routes')
  if (fs.existsSync(routesDest)) rmrf(routesDest)
  ensureDir(routesDest)

  if (fs.existsSync(routesSrc)) {
    const st = fs.statSync(routesSrc)
    if (st.isDirectory()) {
      copyDir(routesSrc, routesDest)
    } else {
      fs.copyFileSync(routesSrc, path.join(routesDest, 'routes.ts'))
    }
  }

  for (const file of walkFiles(dest)) {
    let content = fs.readFileSync(file, 'utf8')
    content = rewriteImports(content, mod.name)
    if (file.includes(`${path.sep}routes${path.sep}`) || file.endsWith(`${path.sep}routes.ts`)) {
      content = rewriteRoutePrefixes(content, mod.prefix)
    }
    fs.writeFileSync(file, content)
  }

  const registerPath = path.join(dest, 'register_routes.ts')
  const routeEntryCandidates = [
    path.join(routesDest, 'index.ts'),
    path.join(routesDest, 'routes.ts'),
    path.join(routesDest, 'routes', 'index.ts'),
  ]
  let entryRel = null
  for (const c of routeEntryCandidates) {
    if (fs.existsSync(c)) {
      entryRel = './' + path.relative(dest, c).replace(/\\/g, '/').replace(/\.ts$/, '.js')
      break
    }
  }
  if (!entryRel) {
    const anyRoute = walkFiles(routesDest).find((f) => f.endsWith('.ts'))
    if (anyRoute) {
      entryRel = './' + path.relative(dest, anyRoute).replace(/\\/g, '/').replace(/\.ts$/, '.js')
    }
  }

  fs.writeFileSync(
    registerPath,
    `import type { ApplicationService } from '@adonisjs/core/types'

export async function register${pascal(mod.name)}Routes(_app?: ApplicationService) {
  ${entryRel ? `await import('${entryRel}')` : `// no routes found for ${mod.name}`}
}

export const ${mod.name}ModuleMeta = {
  name: '${mod.name}',
  prefix: '/api/v1/${mod.prefix}',
  schema: '${mod.schemaDefault}',
  phase: 'phase4-in-process',
}
`
  )

  fs.writeFileSync(
    path.join(dest, 'OWNER.md'),
    `# ${mod.name}

- **SoR:** domain module (in-process)
- **Schema:** \`${mod.schemaDefault}\`
- **Phase 4 status:** **Absorbed into Base API**
  - Source copied from satellite into \`app/modules/${mod.name}\`
  - Public prefix: \`/api/v1/${mod.prefix}/*\`
  - Client: \`apps/${mod.webApp}\`
- **Rule:** Other modules must not write this schema's masters.
`
  )

  if (ownerBackup && !ownerBackup.includes('Absorbed into Base API')) {
    fs.writeFileSync(path.join(dest, 'OWNER.phase2.md'), ownerBackup)
  }

  console.log(`API absorbed: ${mod.name} → ${path.relative(PLATFORM, dest)}`)
}

function pascal(name) {
  return name
    .split(/[-_]/)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join('')
}

function mergeWebPackage(satellitePkg, platformPkg, port, apiPrefix) {
  const deps = { ...(platformPkg.dependencies || {}), ...(satellitePkg.dependencies || {}) }
  delete deps['@wmsu/ui']
  deps['@wmsu/ui'] = 'workspace:*'
  const devDeps = {
    ...(platformPkg.devDependencies || {}),
    ...(satellitePkg.devDependencies || {}),
  }
  return {
    name: platformPkg.name,
    version: platformPkg.version || '0.0.1',
    private: true,
    type: 'module',
    scripts: {
      ...(satellitePkg.scripts || {}),
      ...(platformPkg.scripts || {}),
      dev: `vite --port ${port} --host 127.0.0.1`,
      preview: `vite preview --port ${port} --host 127.0.0.1`,
      typecheck: platformPkg.scripts?.typecheck || 'tsc -b --pretty false',
      test: platformPkg.scripts?.test || 'vitest run --passWithNoTests',
    },
    dependencies: deps,
    devDependencies: devDeps,
  }
}

function patchApiClient(filePath, apiPrefix) {
  if (!fs.existsSync(filePath)) return
  let content = fs.readFileSync(filePath, 'utf8')
  content = content.replace(
    /return\s+['"]http:\/\/127\.0\.0\.1:\d+\/api\/v1['"]/g,
    `return '/api/v1/${apiPrefix}'`
  )
  content = content.replace(
    /['"]http:\/\/127\.0\.0\.1:\d+\/api\/v1['"]/g,
    `'/api/v1/${apiPrefix}'`
  )
  fs.writeFileSync(filePath, content)
}

function writeViteConfig(dest, port, apiPrefix) {
  const content = `import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const webRoot = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    dedupe: ['react', 'react-dom'],
    alias: {
      '@': path.resolve(webRoot, './src'),
    },
  },
  server: {
    host: '127.0.0.1',
    port: ${port},
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3500',
        changeOrigin: true,
      },
    },
  },
})
`
  fs.writeFileSync(path.join(dest, 'vite.config.ts'), content)
}

function absorbWeb(mod) {
  const dest = path.join(PLATFORM, 'apps', mod.webApp)
  ensureDir(dest)

  const platformPkgPath = path.join(dest, 'package.json')
  const platformPkg = fs.existsSync(platformPkgPath)
    ? JSON.parse(fs.readFileSync(platformPkgPath, 'utf8'))
    : { name: `@wmsu/${mod.webApp}`, version: '0.0.1', private: true, type: 'module', scripts: {} }

  for (const name of fs.readdirSync(dest)) {
    if (name === 'node_modules' || name === '.env') continue
    rmrf(path.join(dest, name))
  }

  copyDir(mod.webRoot, dest)

  const satPkgPath = path.join(mod.webRoot, 'package.json')
  const satPkg = JSON.parse(fs.readFileSync(satPkgPath, 'utf8'))
  const merged = mergeWebPackage(satPkg, platformPkg, mod.webPort, mod.prefix)
  fs.writeFileSync(path.join(dest, 'package.json'), JSON.stringify(merged, null, 2) + '\n')

  writeViteConfig(dest, mod.webPort, mod.prefix)
  patchApiClient(path.join(dest, 'src/lib/api-client.ts'), mod.prefix)

  const envExample = path.join(dest, '.env.example')
  fs.writeFileSync(
    envExample,
    `VITE_API_URL=/api/v1/${mod.prefix}\nVITE_PLATFORM_IDENTITY_URL=http://127.0.0.1:3500\n`
  )

  console.log(`WEB absorbed: ${mod.webApp} (port ${mod.webPort})`)

  if (mod.extraWebs) {
    for (const extra of mod.extraWebs) {
      if (!fs.existsSync(extra.src)) {
        console.warn(`skip missing extra web: ${extra.src}`)
        continue
      }
      const extraDest = path.join(PLATFORM, 'apps', extra.dest)
      if (fs.existsSync(extraDest)) {
        for (const name of fs.readdirSync(extraDest)) {
          if (name === 'node_modules') continue
          rmrf(path.join(extraDest, name))
        }
      }
      copyDir(extra.src, extraDest)
      const pkgPath = path.join(extraDest, 'package.json')
      if (fs.existsSync(pkgPath)) {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'))
        pkg.name = `@wmsu/${extra.dest}`
        pkg.scripts = {
          ...(pkg.scripts || {}),
          dev: `vite --port ${extra.port} --host 127.0.0.1`,
        }
        if (pkg.dependencies) {
          pkg.dependencies['@wmsu/ui'] = 'workspace:*'
        }
        fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n')
      }
      writeViteConfig(extraDest, extra.port, mod.prefix)
      console.log(`WEB absorbed: ${extra.dest} (port ${extra.port})`)
    }
  }
}

function scaffoldCommonPlatform() {
  const common = path.join(MODULES, 'common-platform')
  for (const folder of ['audit', 'integrations', 'events']) {
    ensureDir(path.join(common, folder))
    const marker = path.join(common, folder, '.gitkeep')
    if (!fs.existsSync(marker)) fs.writeFileSync(marker, '')
  }
  console.log('common-platform audit/integrations/events scaffolded')
}

function writeSatelliteMovedMarkers() {
  const satellites = [
    'wmsu-enrollment',
    'wmsu-finance',
    'wmsu-records',
    'wmsu-library',
    'wmsu-document',
    'wmsu-inventory',
  ]
  for (const name of satellites) {
    const dir = path.join(WMSU, name)
    if (!fs.existsSync(dir)) continue
    fs.writeFileSync(
      path.join(dir, 'MOVED.md'),
      `# Moved into wmsu-platform (Phase 4 absorb)

Canonical location:

- API domain code → \`wmsu-platform/apps/base-api/app/modules/*\`
- Web clients → \`wmsu-platform/apps/*-web\`

Do not start this satellite for new work. Prefer Base API \`:3500\` and platform web apps.
`
    )
  }
}

function main() {
  scaffoldCommonPlatform()
  for (const mod of MODULES_SPEC) {
    if (!fs.existsSync(mod.apiRoot)) {
      console.error(`Missing API root for ${mod.name}: ${mod.apiRoot}`)
      process.exitCode = 1
      continue
    }
    absorbApi(mod)
    if (mod.webRoot && fs.existsSync(mod.webRoot)) absorbWeb(mod)
    else console.warn(`Missing web for ${mod.name}`)
  }
  writeSatelliteMovedMarkers()
  console.log('\\nAbsorb complete. Next: wire imports + routes in base-api, upgrade Adonis, pnpm install.')
}

main()
