import { apiClient } from '@/api/client'
import { apiRequest, apiRequestVoid } from '@/api/utils/request'
import type { ApiListParams } from '@/api/types'

export { formatBytes } from '@/shared/utils/format'

export interface PlatformOverview {
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

export interface AdminPlan {
  id: string
  name: string
  slug: string
  description: string | null
  monthlyPrice: number
  annualPrice: number
  currency: string
  maxUsers: number | null
  maxDocuments: number | null
  maxStorageBytes: number | null
  features: Record<string, unknown> | null
  isActive: boolean
  sortOrder: number
}

export interface AdminTenant {
  id: string
  name: string
  slug: string
  status: string
  planTier: string | null
  trialEndsAt: string | null
  createdAt: string
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
  revenueByPlan: Array<{
    planSlug: string
    planName: string
    tenantCount: number
    mrr: number
  }>
}

export const adminApi = {
  analyticsOverview: (): Promise<{ overview: PlatformOverview }> =>
    apiRequest(apiClient.get<{ overview: PlatformOverview }>('/admin/analytics/overview')),

  analyticsRevenue: (
    months = 6
  ): Promise<{
    monthly: Array<{ month: string; revenue: number; payments: number }>
    byPlan: BillingOverview['revenueByPlan']
  }> =>
    apiRequest(
      apiClient.get<{
        monthly: Array<{ month: string; revenue: number; payments: number }>
        byPlan: BillingOverview['revenueByPlan']
      }>('/admin/analytics/revenue', { params: { months } })
    ),

  analyticsTenants: (
    params?: ApiListParams
  ): Promise<{ data: TenantUsageRow[]; meta: Record<string, unknown> }> =>
    apiRequest(
      apiClient.get<{ data: TenantUsageRow[]; meta: Record<string, unknown> }>(
        '/admin/analytics/tenants',
        { params }
      )
    ),

  billingOverview: (): Promise<{ billing: BillingOverview }> =>
    apiRequest(apiClient.get<{ billing: BillingOverview }>('/admin/billing/overview')),

  tenants: (
    params?: ApiListParams
  ): Promise<{ data: AdminTenant[]; meta: Record<string, unknown> }> =>
    apiRequest(
      apiClient.get<{ data: AdminTenant[]; meta: Record<string, unknown> }>('/admin/tenants', {
        params,
      })
    ),

  suspendTenant: (id: string): Promise<void> =>
    apiRequestVoid(apiClient.post(`/admin/tenants/${id}/suspend`)),

  activateTenant: (id: string): Promise<void> =>
    apiRequestVoid(apiClient.post(`/admin/tenants/${id}/activate`)),

  plans: (): Promise<{ plans: AdminPlan[] }> =>
    apiRequest(apiClient.get<{ plans: AdminPlan[] }>('/admin/plans')),

  updatePlan: (id: string, data: Partial<AdminPlan>): Promise<unknown> =>
    apiRequest(apiClient.put(`/admin/plans/${id}`, data)),

  createPlan: (data: Record<string, unknown>): Promise<unknown> =>
    apiRequest(apiClient.post('/admin/plans', data)),
}

/** Platform-admin currency display (USD / en-US). Tenant UI uses shared formatCurrency (PHP). */
export function formatCurrency(amount: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount)
}
