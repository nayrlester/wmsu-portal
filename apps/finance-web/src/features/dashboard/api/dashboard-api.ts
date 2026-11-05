import { apiClient } from '@/lib/api-client'

export interface UfmsDashboardStats {
  budgetPlans: number
  journalEntries: number
  openPurchaseOrders: number
  posSalesToday: number
  pendingRequisitions: number
  collectionsToday?: number
  openReceivables?: number
  agingCurrent?: number
  agingOver30?: number
  budgetUtilizationPct?: number
}

export async function fetchDashboardSummary(): Promise<UfmsDashboardStats> {
  const { data } = await apiClient.get('/dashboard/summary')
  const payload = data.data ?? data
  const aging = payload.receivablesAging ?? payload.aging ?? {}
  const budget = payload.budget ?? payload.saob ?? {}
  const current = Number(aging.current ?? aging['0_30'] ?? aging.bucket0_30 ?? 0)
  const over30 =
    Number(aging.over30 ?? 0) ||
    Number(aging['31_60'] ?? 0) +
      Number(aging['61_90'] ?? 0) +
      Number(aging['90_plus'] ?? aging.over90 ?? 0)
  const allotted = Number(budget.appropriations ?? budget.totalAllotment ?? budget.allotment ?? 0)
  const obligated = Number(budget.obligations ?? budget.totalObligation ?? budget.obligated ?? 0)
  const util =
    allotted > 0
      ? Math.round((obligated / allotted) * 1000) / 10
      : Number(budget.utilizationPct ?? 0)
  return {
    budgetPlans: Number(payload.budgetPlans ?? 0),
    journalEntries: Number(payload.journalEntries ?? 0),
    openPurchaseOrders: Number(payload.openPurchaseOrders ?? 0),
    posSalesToday: Number(payload.posSalesToday ?? 0),
    pendingRequisitions: Number(payload.pendingRequisitions ?? 0),
    collectionsToday: Number(payload.collectionsToday ?? payload.collections_today ?? 0),
    openReceivables: Number(
      payload.openReceivables ?? aging.open ?? aging.total ?? current + over30
    ),
    agingCurrent: current,
    agingOver30: over30,
    budgetUtilizationPct: util,
  }
}
