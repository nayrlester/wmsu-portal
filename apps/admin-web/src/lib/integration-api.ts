import { notifyFetchResponseError, notifyFetchJsonSuccess } from '@wmsu/ui'

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:3500'
const SERVICE_KEY = import.meta.env.VITE_SERVICE_API_KEY ?? ''

export type IntegrationOverview = {
  capabilities: string[]
  counts: Record<string, number>
  ownershipBoundaries: Record<string, string>
}

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, { headers: { Accept: 'application/json' } })
  if (!res.ok) {
    await notifyFetchResponseError(res)
    throw new Error(`GET ${path} failed (${res.status})`)
  }
  const body = await res.json()
  return body.data as T
}

async function postJson<T>(path: string, payload: unknown, extraHeaders?: Record<string, string>): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...(SERVICE_KEY ? { 'X-Service-Api-Key': SERVICE_KEY } : {}),
      'X-Source-System': 'admin-portal',
      ...extraHeaders,
    },
    body: JSON.stringify(payload),
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) {
    await notifyFetchResponseError(res, body?.message ?? `POST ${path} failed (${res.status})`)
    throw new Error(body?.message ?? `POST ${path} failed (${res.status})`)
  }
  await notifyFetchJsonSuccess(res, 'POST')
  return body.data as T
}

export const integrationApi = {
  overview: () => getJson<IntegrationOverview>('/api/v1/integration/overview'),
  clearanceTypes: () => getJson<Record<string, unknown>[]>('/api/v1/integration/clearance/types'),
  clearance: (subjectKey: string) =>
    getJson<{
      overallStatus: string
      breakdown: Array<Record<string, unknown>>
      note: string
    }>(`/api/v1/integration/clearance/${encodeURIComponent(subjectKey)}`),
  upsertRequirement: (payload: Record<string, unknown>, idempotencyKey: string) =>
    postJson('/api/v1/integration/clearance/requirements', payload, {
      'Idempotency-Key': idempotencyKey,
    }),
  auditLogs: () => getJson<Record<string, unknown>[]>('/api/v1/integration/audit-logs'),
}
