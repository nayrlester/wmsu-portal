import { apiClient } from '@/lib/api-client'

function unwrapList<T>(payload: any): T[] {
  if (Array.isArray(payload?.data)) return payload.data
  if (Array.isArray(payload?.data?.data)) return payload.data.data
  return []
}

export async function fetchJournals(params?: Record<string, string>) {
  const { data } = await apiClient.get('/accounting/journals', { params })
  return unwrapList<any>(data)
}

export async function createJournal(body: Record<string, unknown>) {
  const { data } = await apiClient.post('/accounting/journals', body)
  return data.data
}

export async function postJournal(id: string) {
  const { data } = await apiClient.post(`/accounting/journals/${id}/post`)
  return data.data
}

export async function fetchTrialBalance(fiscalYear: string) {
  const { data } = await apiClient.get('/accounting/trial-balance', { params: { fiscalYear } })
  return data.data
}

export async function fetchCashFlow(fiscalYear: string) {
  const { data } = await apiClient.get('/accounting/cash-flow', { params: { fiscalYear } })
  return data.data
}

export async function fetchLedger(params?: Record<string, string>) {
  const { data } = await apiClient.get('/accounting/ledger', { params })
  return unwrapList<any>(data)
}

export async function fetchTaxRates() {
  const { data } = await apiClient.get('/accounting/tax-rates')
  return unwrapList<any>(data)
}

export async function createTaxRate(body: Record<string, unknown>) {
  const { data } = await apiClient.post('/accounting/tax-rates', body)
  return data.data
}

export async function createTaxEntry(body: Record<string, unknown>) {
  const { data } = await apiClient.post('/accounting/tax-entries', body)
  return data.data
}

export async function fetchRemittance() {
  const { data } = await apiClient.get('/accounting/tax-remittance')
  return data.data
}

export async function fetchReconciliations() {
  const { data } = await apiClient.get('/accounting/bank-reconciliations')
  return unwrapList<any>(data)
}

export async function createReconciliation(body: Record<string, unknown>) {
  const { data } = await apiClient.post('/accounting/bank-reconciliations', body)
  return data.data
}

export async function fetchFunds() {
  const { data } = await apiClient.get('/funds', { params: { limit: 100 } })
  return unwrapList<any>(data)
}

export async function fetchAccounts() {
  const { data } = await apiClient.get('/coa', { params: { limit: 100 } })
  return unwrapList<any>(data)
}

export async function fetchBankAccounts() {
  const { data } = await apiClient.get('/bank-accounts', { params: { limit: 100 } })
  return unwrapList<any>(data)
}
