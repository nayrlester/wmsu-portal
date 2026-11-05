import { apiClient } from '@/lib/api-client'

export interface UfmsDashboardStats {
  budgetPlans: number
  journalEntries: number
  openPurchaseOrders: number
  posSalesToday: number
  pendingRequisitions: number
}

export async function fetchDashboardSummary(): Promise<UfmsDashboardStats> {
  const { data } = await apiClient.get('/dashboard/summary')
  const payload = data.data ?? data
  return {
    budgetPlans: Number(payload.budgetPlans ?? 0),
    journalEntries: Number(payload.journalEntries ?? 0),
    openPurchaseOrders: Number(payload.openPurchaseOrders ?? 0),
    posSalesToday: Number(payload.posSalesToday ?? 0),
    pendingRequisitions: Number(payload.pendingRequisitions ?? 0),
  }
}
