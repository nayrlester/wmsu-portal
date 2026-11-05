import { apiClient } from '@/lib/api-client'

export async function fetchUfmsSettings() {
  const { data } = await apiClient.get('/settings/ufms')
  return data.data
}

export async function updateUfmsSettings(payload: Record<string, unknown>) {
  const { data } = await apiClient.put('/settings/ufms', payload)
  return data.data
}

export async function seedOfficialCoa() {
  const { data } = await apiClient.post('/coa/seed-official')
  return data.data
}

export async function fetchOrSeries() {
  const { data } = await apiClient.get('/or-series')
  return data.data
}
