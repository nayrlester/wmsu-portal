import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const outDir = path.resolve(__dirname, '../docs/api')
const outFile = path.join(outDir, 'openapi.json')

const openApiDocument = {
  openapi: '3.0.3',
  info: {
    title: 'WMSU CIS Platform API',
    version: '0.0.1',
    description: 'Infrastructure health and platform bootstrap endpoints (no business modules).',
  },
  servers: [{ url: 'http://127.0.0.1:3500', description: 'Local development' }],
  paths: {
    '/api/v1/health/live': {
      get: {
        summary: 'Liveness probe',
        responses: { '200': { description: 'Process is alive' } },
      },
    },
    '/api/v1/health': {
      get: {
        summary: 'Readiness health check (Postgres + Redis)',
        responses: {
          '200': { description: 'Healthy or degraded' },
          '503': { description: 'All critical dependencies down' },
        },
      },
    },
    '/api/v1/ping': {
      get: {
        summary: 'Ping API and enqueue infra.ping job',
        responses: { '200': { description: 'Pong with optional queued job id' } },
      },
    },
  },
}

fs.mkdirSync(outDir, { recursive: true })
fs.writeFileSync(outFile, `${JSON.stringify(openApiDocument, null, 2)}\n`, 'utf8')
console.log(`Wrote ${path.relative(path.resolve(__dirname, '..'), outFile)}`)
