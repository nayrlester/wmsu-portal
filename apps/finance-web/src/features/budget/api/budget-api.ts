import { apiClient } from '@/lib/api-client'
import type {
  AccountOption,
  BudgetDocument,
  BudgetMonitor,
  BudgetObligation,
  FinancialPlan,
  FundOption,
} from '../types'

function unwrapList<T>(payload: any): T[] {
  if (Array.isArray(payload?.data)) return payload.data
  if (Array.isArray(payload?.data?.data)) return payload.data.data
  return []
}

export async function fetchBudgetPlans(params?: Record<string, string>) {
  const { data } = await apiClient.get('/budget/plans', { params })
  return unwrapList<FinancialPlan>(data)
}

export async function createBudgetPlan(body: Record<string, unknown>) {
  const { data } = await apiClient.post('/budget/plans', body)
  return data.data as FinancialPlan
}

export async function submitBudgetPlan(id: string) {
  const { data } = await apiClient.post(`/budget/plans/${id}/submit`)
  return data.data as FinancialPlan
}

export async function approveBudgetPlan(id: string) {
  const { data } = await apiClient.post(`/budget/plans/${id}/approve`)
  return data.data as FinancialPlan
}

export async function rejectBudgetPlan(id: string, rejectionReason: string) {
  const { data } = await apiClient.post(`/budget/plans/${id}/reject`, { rejectionReason })
  return data.data as FinancialPlan
}

export async function fetchBudgetDocuments(params?: Record<string, string>) {
  const { data } = await apiClient.get('/budget/documents', { params })
  return unwrapList<BudgetDocument>(data)
}

export async function createBudgetDocument(body: Record<string, unknown>) {
  const { data } = await apiClient.post('/budget/documents', body)
  return data.data as BudgetDocument
}

export async function submitBudgetDocument(id: string) {
  const { data } = await apiClient.post(`/budget/documents/${id}/submit`)
  return data.data as BudgetDocument
}

export async function approveBudgetDocument(id: string) {
  const { data } = await apiClient.post(`/budget/documents/${id}/approve`)
  return data.data as BudgetDocument
}

export async function rejectBudgetDocument(id: string, rejectionReason: string) {
  const { data } = await apiClient.post(`/budget/documents/${id}/reject`, { rejectionReason })
  return data.data as BudgetDocument
}

export async function fetchBudgetObligations(params?: Record<string, string>) {
  const { data } = await apiClient.get('/budget/obligations', { params })
  return unwrapList<BudgetObligation>(data)
}

export async function createBudgetObligation(body: Record<string, unknown>) {
  const { data } = await apiClient.post('/budget/obligations', body)
  return data.data as BudgetObligation
}

export async function postBudgetObligation(id: string) {
  const { data } = await apiClient.post(`/budget/obligations/${id}/post`)
  return data.data as BudgetObligation
}

export async function fetchBudgetMonitor(fiscalYear: string) {
  const { data } = await apiClient.get('/budget/monitor', { params: { fiscalYear } })
  return data.data as BudgetMonitor
}

export async function fetchFunds() {
  const { data } = await apiClient.get('/funds', { params: { limit: 100 } })
  return unwrapList<FundOption>(data)
}

export async function fetchAccounts() {
  const { data } = await apiClient.get('/coa', { params: { limit: 100 } })
  return unwrapList<AccountOption>(data)
}
