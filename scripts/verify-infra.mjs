import { setTimeout as sleep } from 'node:timers/promises'

const API = process.env.API_BASE_URL ?? 'http://127.0.0.1:3500'
const WEB = process.env.WEB_PORTAL_URL ?? 'http://127.0.0.1:5173'
const ADMIN = process.env.ADMIN_PORTAL_URL ?? 'http://127.0.0.1:5174'

async function getJson(url) {
  const res = await fetch(url, { signal: AbortSignal.timeout(8000) })
  const body = await res.json().catch(() => null)
  return { ok: res.ok, status: res.status, body }
}

async function getText(url) {
  const res = await fetch(url, { signal: AbortSignal.timeout(8000) })
  const body = await res.text()
  return { ok: res.ok, status: res.status, body }
}

const failures = []

console.log('Verifying WMSU CIS platform infrastructure…')

const live = await getJson(`${API}/api/v1/health/live`)
console.log(`live: ${live.status} ${JSON.stringify(live.body?.data ?? live.body)}`)
if (!live.ok) failures.push('health/live')

const health = await getJson(`${API}/api/v1/health`)
console.log(`health: ${health.status}`)
console.log(JSON.stringify(health.body?.data ?? health.body, null, 2))
if (!health.ok || health.body?.data?.status !== 'ok') failures.push('health')

const postgres = health.body?.data?.components?.find((c) => c.name === 'postgres')
const redis = health.body?.data?.components?.find((c) => c.name === 'redis')
if (postgres?.status !== 'ok') failures.push('postgres')
if (redis?.status !== 'ok') failures.push('redis')

const ping = await getJson(`${API}/api/v1/ping`)
console.log(`ping: ${ping.status} job=${ping.body?.data?.queuedJobId ?? 'null'}`)
if (!ping.ok) failures.push('ping')

await sleep(1500)

const openapi = await getJson(`${API}/api/v1/openapi.json`)
console.log(`openapi: ${openapi.status}`)
if (!openapi.ok || !openapi.body?.openapi) failures.push('openapi')

const web = await getText(WEB)
console.log(`web-portal: ${web.status}`)
if (!web.ok || !web.body.includes('root')) failures.push('web-portal')

const admin = await getText(ADMIN)
console.log(`admin-web: ${admin.status}`)
if (!admin.ok || !admin.body.includes('root')) failures.push('admin-web')

const gateway = await getJson(`${API}/api/v1/gateway`)
console.log(`gateway: ${gateway.status}`)
if (!gateway.ok || !gateway.body?.data?.systems) failures.push('gateway')

if (failures.length) {
  console.error(`\nFAILED: ${failures.join(', ')}`)
  process.exit(1)
}

console.log('\nAll infrastructure checks passed.')
