import { apiClient } from '@/lib/api-client'

function unwrap<T>(body: any): T {
  return (body?.data ?? body) as T
}

export async function fetchCatalog() {
  const { data } = await apiClient.get('/pos/catalog', { params: { activeOnly: true } })
  return unwrap<any[]>(data)
}

export async function createCatalogItem(payload: Record<string, unknown>) {
  const { data } = await apiClient.post('/pos/catalog', payload)
  return unwrap<any>(data)
}

export async function fetchSales() {
  const { data } = await apiClient.get('/pos/sales')
  return unwrap<any[]>(data)
}

export async function createSale(payload: Record<string, unknown>) {
  const { data } = await apiClient.post('/pos/sales', payload)
  return unwrap<any>(data)
}

export async function completeSale(id: string, payments: Array<Record<string, unknown>>) {
  const { data } = await apiClient.post(`/pos/sales/${id}/complete`, { payments })
  return unwrap<any>(data)
}

export async function voidSale(id: string, reason: string) {
  const { data } = await apiClient.post(`/pos/sales/${id}/void`, { reason })
  return unwrap<any>(data)
}

export async function closeEod(payload: Record<string, unknown>) {
  const { data } = await apiClient.post('/pos/eod', payload)
  return unwrap<any>(data)
}

export async function fetchCashierReport() {
  const { data } = await apiClient.get('/pos/reports/cashier')
  return unwrap<any>(data)
}

export async function fetchStockSnapshots() {
  const { data } = await apiClient.get('/pos/stock-snapshots')
  return unwrap<any[]>(data)
}
