import { apiClient } from '@/api/client'
import { apiRequest, apiRequestVoid } from '@/api/utils/request'
import type {
  BillingPlan,
  DashboardStats,
  DashboardTrendPoint,
  DashboardFilesTrendPoint,
  DashboardUserAccess,
  UsageTrendReport,
  RoleRecord,
  PermissionCatalog,
  SubscriptionInfo,
  TenantSettings,
  UsageReport,
} from '@/shared/types'
import type { Organization } from '@/types/api'

export interface CreateRoleInput {
  name: string
  slug: string
  description?: string
  permissionIds?: string[]
}

export interface UpdateRoleInput {
  name: string
  description?: string | null
}

export const rolesApi = {
  list: (): Promise<{ roles: RoleRecord[] }> =>
    apiRequest(apiClient.get<{ roles: RoleRecord[] }>('/account/roles')),

  listPermissions: (): Promise<{ permissions: PermissionCatalog }> =>
    apiRequest(apiClient.get<{ permissions: PermissionCatalog }>('/account/permissions')),

  create: (data: CreateRoleInput): Promise<{ id: string; name: string; slug: string; permissions: string[] }> =>
    apiRequest(apiClient.post('/account/roles', data)),

  update: (id: string, data: UpdateRoleInput): Promise<RoleRecord> =>
    apiRequest(apiClient.put<RoleRecord>(`/account/roles/${id}`, data)),

  updatePermissions: (id: string, permissionIds: string[]): Promise<{ id: string; permissions: string[] }> =>
    apiRequest(apiClient.put(`/account/roles/${id}/permissions`, { permissionIds })),

  delete: (id: string): Promise<void> =>
    apiRequestVoid(apiClient.delete(`/account/roles/${id}`)),
}

export const settingsApi = {
  organization: (): Promise<Organization> =>
    apiRequest(apiClient.get<Organization>('/account/organization')),

  updateOrganization: (data: { name?: string; slug?: string }): Promise<Organization> =>
    apiRequest(apiClient.put<Organization>('/account/organization', data)),

  tenantSettings: (): Promise<TenantSettings> =>
    apiRequest(apiClient.get<TenantSettings>('/account/settings')),

  updateTenantSettings: (data: Partial<TenantSettings>): Promise<TenantSettings> =>
    apiRequest(apiClient.put<TenantSettings>('/account/settings', data)),

  subscription: (): Promise<SubscriptionInfo> =>
    apiRequest(apiClient.get<SubscriptionInfo>('/account/subscription')),

  subscriptionUsage: (): Promise<UsageReport> =>
    apiRequest(apiClient.get<UsageReport>('/account/subscription/usage')),
}

export const billingApi = {
  /** Public marketing pricing — no auth/session required */
  plans: (): Promise<{ plans: BillingPlan[] }> =>
    apiRequest(
      apiClient.get<{ plans: BillingPlan[] }>('/public/plans', {
        skipAuth: true,
        skipTenant: true,
      })
    ),

  /** Authenticated tenant billing context */
  accountPlans: (): Promise<{ plans: BillingPlan[] }> =>
    apiRequest(apiClient.get<{ plans: BillingPlan[] }>('/account/billing/plans')),

  upgrade: (data: { planSlug: string; billingCycle?: string }): Promise<{ subscription: unknown }> =>
    apiRequest(apiClient.post<{ subscription: unknown }>('/account/billing/upgrade', data)),

  downgrade: (data: {
    planSlug: string
    billingCycle?: string
    immediate?: boolean
  }): Promise<{ subscription: unknown }> =>
    apiRequest(apiClient.post<{ subscription: unknown }>('/account/billing/downgrade', data)),
}

export const dashboardApi = {
  stats: (): Promise<DashboardStats> =>
    apiRequest(apiClient.get<DashboardStats>('/account/dashboard/stats')),

  overview: (months = 6): Promise<{
    stats: DashboardStats
    recentDocuments: Array<{
      id: string
      title: string
      trackingNumber: string
      status: string
      updatedAt: string
    }>
    pendingApprovalsCount: number
  }> =>
    apiRequest(
      apiClient.get('/account/dashboard/overview', {
        params: { months },
      })
    ),

  trend: (months = 6): Promise<{ monthly: DashboardTrendPoint[] }> =>
    apiRequest(
      apiClient.get<{ monthly: DashboardTrendPoint[] }>('/account/dashboard/trend', {
        params: { months },
      })
    ),

  filesTrend: (days = 30): Promise<{ daily: DashboardFilesTrendPoint[] }> =>
    apiRequest(
      apiClient.get<{ daily: DashboardFilesTrendPoint[] }>('/account/dashboard/files-trend', {
        params: { days },
      })
    ),

  usageTrend: (months = 6): Promise<UsageTrendReport> =>
    apiRequest(
      apiClient.get<UsageTrendReport>('/account/dashboard/usage-trend', {
        params: { months },
      })
    ),

  userAccess: (): Promise<DashboardUserAccess> =>
    apiRequest(apiClient.get<DashboardUserAccess>('/account/dashboard/user-access')),
}

export const permissionsApi = {
  mine: (): Promise<{ permissions: string[] }> =>
    apiRequest(apiClient.get<{ permissions: string[] }>('/account/permissions/me')),
}
