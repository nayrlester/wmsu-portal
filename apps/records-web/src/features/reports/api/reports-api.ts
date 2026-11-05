import { apiClient } from '@/lib/api-client'

export async function fetchRequestReport(params: {
  kind: 'transcript' | 'certification'
  status?: string
  locality?: string
  certificationType?: string
  from?: string
  to?: string
  limit?: number
}) {
  const { data } = await apiClient.get('/torms/reports/requests', { params })
  return {
    items: (data.data ?? []) as Array<Record<string, unknown>>,
    meta: data.meta as { total: number; limit: number; offset: number },
  }
}

export async function fetchIssuanceReport(params: {
  kind: 'transcript' | 'certification'
  from?: string
  to?: string
  limit?: number
}) {
  const { data } = await apiClient.get('/torms/reports/issuances', { params })
  return {
    items: (data.data ?? []) as Array<Record<string, unknown>>,
    meta: data.meta as { total: number; limit: number; offset: number },
  }
}

export function csvExportUrl(
  path: '/torms/reports/requests' | '/torms/reports/issuances',
  params: Record<string, string | undefined>
) {
  const qs = new URLSearchParams()
  Object.entries(params).forEach(([k, v]) => {
    if (v) qs.set(k, v)
  })
  qs.set('format', 'csv')
  return `${path}?${qs.toString()}`
}
