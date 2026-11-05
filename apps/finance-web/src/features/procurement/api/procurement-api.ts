import { apiClient } from '@/lib/api-client'

function unwrap<T>(body: any): T {
  return (body?.data ?? body) as T
}

export async function fetchVendors() {
  const { data } = await apiClient.get('/procurement/vendors')
  return unwrap<any[]>(data)
}

export async function createVendor(payload: Record<string, unknown>) {
  const { data } = await apiClient.post('/procurement/vendors', payload)
  return unwrap<any>(data)
}

export async function fetchRequisitions(params?: { fiscalYear?: string }) {
  const { data } = await apiClient.get('/procurement/requisitions', { params })
  return unwrap<any[]>(data)
}

export async function createRequisition(payload: Record<string, unknown>) {
  const { data } = await apiClient.post('/procurement/requisitions', payload)
  return unwrap<any>(data)
}

export async function submitRequisition(id: string) {
  const { data } = await apiClient.post(`/procurement/requisitions/${id}/submit`)
  return unwrap<any>(data)
}

export async function approveRequisition(id: string) {
  const { data } = await apiClient.post(`/procurement/requisitions/${id}/approve`)
  return unwrap<any>(data)
}

export async function rejectRequisition(id: string, reason: string) {
  const { data } = await apiClient.post(`/procurement/requisitions/${id}/reject`, { reason })
  return unwrap<any>(data)
}

export async function fetchRfqs() {
  const { data } = await apiClient.get('/procurement/rfqs')
  return unwrap<any[]>(data)
}

export async function createRfq(payload: Record<string, unknown>) {
  const { data } = await apiClient.post('/procurement/rfqs', payload)
  return unwrap<any>(data)
}

export async function issueRfq(id: string) {
  const { data } = await apiClient.post(`/procurement/rfqs/${id}/issue`)
  return unwrap<any>(data)
}

export async function createQuotation(payload: Record<string, unknown>) {
  const { data } = await apiClient.post('/procurement/quotations', payload)
  return unwrap<any>(data)
}

export async function createAbstract(payload: Record<string, unknown>) {
  const { data } = await apiClient.post('/procurement/abstracts', payload)
  return unwrap<any>(data)
}

export async function createAward(payload: Record<string, unknown>) {
  const { data } = await apiClient.post('/procurement/awards', payload)
  return unwrap<any>(data)
}

export async function fetchOrders() {
  const { data } = await apiClient.get('/procurement/orders')
  return unwrap<any[]>(data)
}

export async function createOrder(payload: Record<string, unknown>) {
  const { data } = await apiClient.post('/procurement/orders', payload)
  return unwrap<any>(data)
}

export async function approveOrder(id: string) {
  const { data } = await apiClient.post(`/procurement/orders/${id}/approve`)
  return unwrap<any>(data)
}

export async function issueOrder(id: string) {
  const { data } = await apiClient.post(`/procurement/orders/${id}/issue`)
  return unwrap<any>(data)
}

export async function createDelivery(payload: Record<string, unknown>) {
  const { data } = await apiClient.post('/procurement/deliveries', payload)
  return unwrap<any>(data)
}

export async function fetchIars() {
  const { data } = await apiClient.get('/procurement/iars')
  return unwrap<any[]>(data)
}

export async function createIar(payload: Record<string, unknown>) {
  const { data } = await apiClient.post('/procurement/iars', payload)
  return unwrap<any>(data)
}

export async function fetchProcurementMonitor() {
  const { data } = await apiClient.get('/procurement/monitor')
  return unwrap<any>(data)
}

export async function fetchFunds() {
  const { data } = await apiClient.get('/funds')
  return unwrap<any[]>(data)
}

export async function fetchAccounts() {
  const { data } = await apiClient.get('/coa')
  return unwrap<any[]>(data)
}
