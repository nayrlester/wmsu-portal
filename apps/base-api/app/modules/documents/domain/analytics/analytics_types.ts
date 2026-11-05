export interface PlatformOverviewMetrics {
  mrr: number
  arr: number
  churnRate: number
  activeTenants: number
  trialingTenants: number
  suspendedTenants: number
  totalTenants: number
  storageBytes: number
  currency: string
  periodStart: string
  periodEnd: string
}

export interface RevenueByPlan {
  planSlug: string
  planName: string
  tenantCount: number
  mrr: number
}

export interface MonthlyRevenuePoint {
  month: string
  revenue: number
  payments: number
}

export interface TenantUsageRow {
  tenantId: string
  tenantName: string
  tenantSlug: string
  status: string
  planSlug: string | null
  planName: string | null
  subscriptionStatus: string | null
  users: number
  documents: number
  storageBytes: number
  mrr: number
}

export interface BillingOverview {
  totalRevenue: number
  revenueThisMonth: number
  outstandingInvoices: number
  paidInvoices: number
  recentPayments: Array<{
    id: string
    tenantId: string
    tenantName: string
    amount: number
    currency: string
    status: string
    paidAt: string | null
  }>
  revenueByPlan: RevenueByPlan[]
}
