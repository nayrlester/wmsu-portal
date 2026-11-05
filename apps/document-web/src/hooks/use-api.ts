export {
  useDepartments,
  useDocumentTypes,
  useDocumentFiles,
  useDocumentActivity,
  useDocumentWorkflow,
  useDocuments,
  useDocument,
  useDocumentTimeline,
  useCreateDocument,
  useSubmitDocument,
  useDocumentApproval,
  usePendingApprovals,
} from '@/features/documents/hooks/use-documents'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { dashboardApi, settingsApi, billingApi } from '@/api/modules/platform.api'
import { workflowsApi } from '@/api/modules/workflows.api'
import { rolesApi } from '@/api/modules/platform.api'
import { catalogApi } from '@/api/modules/catalog.api'
import { useTenantStore } from '@/shared/store/tenant-store'
import type {
  CreateDepartmentInput,
  CreateDocumentTypeInput,
  UpdateDepartmentInput,
  UpdateDocumentTypeInput,
} from '@/api/modules/catalog.api'
import type { TenantSettings } from '@/types/api'

export function useDashboardOverview(enabled = true, months = 6) {
  return useQuery({
    queryKey: ['dashboard-overview', months],
    queryFn: () => dashboardApi.overview(months),
    staleTime: 60_000,
    enabled,
  })
}

export function useDashboardStats() {
  return useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => dashboardApi.stats(),
    staleTime: 60_000,
  })
}

export function useDashboardTrend(enabled = true, months = 6) {
  return useQuery({
    queryKey: ['dashboard-trend', months],
    queryFn: () => dashboardApi.trend(months),
    staleTime: 60_000,
    enabled,
  })
}

export function useUsageTrend(enabled = true, months = 6) {
  return useQuery({
    queryKey: ['usage-trend', months],
    queryFn: () => dashboardApi.usageTrend(months),
    staleTime: 60_000,
    enabled,
  })
}

export function useFilesTrend(enabled = true, days = 30) {
  return useQuery({
    queryKey: ['files-trend', days],
    queryFn: () => dashboardApi.filesTrend(days),
    staleTime: 60_000,
    enabled,
  })
}

export function useUserAccess(enabled = true) {
  return useQuery({
    queryKey: ['user-access'],
    queryFn: () => dashboardApi.userAccess(),
    staleTime: 60_000,
    enabled,
  })
}

export function useWorkflows() {
  return useQuery({
    queryKey: ['workflows'],
    queryFn: () => workflowsApi.list({ limit: 50 }),
    staleTime: 5 * 60_000,
  })
}

export function useRoles(enabled = true) {
  return useQuery({
    queryKey: ['roles'],
    queryFn: () => rolesApi.list().then((r) => r.roles),
    staleTime: 10 * 60_000,
    enabled,
  })
}

export function usePermissionCatalog(enabled = true) {
  return useQuery({
    queryKey: ['permission-catalog'],
    queryFn: () => rolesApi.listPermissions(),
    staleTime: 15 * 60_000,
    enabled,
  })
}

export function useCreateRole() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: rolesApi.create,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['roles'] }),
  })
}

export function useUpdateRole() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string } & Parameters<typeof rolesApi.update>[1]) =>
      rolesApi.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['roles'] }),
  })
}

export function useUpdateRolePermissions() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, permissionIds }: { id: string; permissionIds: string[] }) =>
      rolesApi.updatePermissions(id, permissionIds),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['roles'] }),
  })
}

export function useDeleteRole() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: rolesApi.delete,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['roles'] }),
  })
}

export function useOrganization() {
  return useQuery({
    queryKey: ['organization'],
    queryFn: () => settingsApi.organization(),
    staleTime: 10 * 60_000,
  })
}

export function useSubscription() {
  return useQuery({
    queryKey: ['subscription'],
    queryFn: () => settingsApi.subscription(),
  })
}

export function useSubscriptionUsage() {
  return useQuery({
    queryKey: ['subscription-usage'],
    queryFn: () => settingsApi.subscriptionUsage(),
  })
}

export function useTenantSettings() {
  return useQuery({
    queryKey: ['tenant-settings'],
    queryFn: () => settingsApi.tenantSettings(),
  })
}

export function useBillingPlans() {
  return useQuery({
    queryKey: ['billing-plans'],
    queryFn: () => billingApi.accountPlans(),
  })
}

export function useUpdateOrganization() {
  const queryClient = useQueryClient()
  const setOrganization = useTenantStore((s) => s.setOrganization)

  return useMutation({
    mutationFn: settingsApi.updateOrganization,
    onSuccess: (organization) => {
      setOrganization(organization)
      queryClient.invalidateQueries({ queryKey: ['organization'] })
    },
  })
}

export function useUpdateTenantSettings() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: Partial<TenantSettings>) => settingsApi.updateTenantSettings(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant-settings'] })
    },
  })
}

export function useUpgradePlan() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: billingApi.upgrade,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscription'] })
      queryClient.invalidateQueries({ queryKey: ['subscription-usage'] })
      queryClient.invalidateQueries({ queryKey: ['organization'] })
    },
  })
}

export function useDowngradePlan() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: billingApi.downgrade,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscription'] })
      queryClient.invalidateQueries({ queryKey: ['subscription-usage'] })
      queryClient.invalidateQueries({ queryKey: ['organization'] })
    },
  })
}

export function useCreateWorkflow() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: workflowsApi.create,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['workflows'] }),
  })
}

export function useUpdateWorkflow() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string } & Parameters<typeof workflowsApi.update>[1]) =>
      workflowsApi.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['workflows'] }),
  })
}

export function useDeleteWorkflow() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: workflowsApi.delete,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['workflows'] }),
  })
}

function invalidateCatalogQueries(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ['catalog-departments'] })
  queryClient.invalidateQueries({ queryKey: ['catalog-document-types'] })
  queryClient.invalidateQueries({ queryKey: ['departments'] })
  queryClient.invalidateQueries({ queryKey: ['document-types'] })
}

export function useCatalogDepartments() {
  return useQuery({
    queryKey: ['catalog-departments'],
    queryFn: () => catalogApi.departments.list(),
  })
}

export function useCreateDepartment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateDepartmentInput) => catalogApi.departments.create(data),
    onSuccess: () => invalidateCatalogQueries(queryClient),
  })
}

export function useUpdateDepartment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: UpdateDepartmentInput & { id: string }) =>
      catalogApi.departments.update(id, data),
    onSuccess: () => invalidateCatalogQueries(queryClient),
  })
}

export function useDeactivateDepartment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: catalogApi.departments.deactivate,
    onSuccess: () => invalidateCatalogQueries(queryClient),
  })
}

export function useCatalogDocumentTypes() {
  return useQuery({
    queryKey: ['catalog-document-types'],
    queryFn: () => catalogApi.documentTypes.list(),
  })
}

export function useCreateDocumentType() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateDocumentTypeInput) => catalogApi.documentTypes.create(data),
    onSuccess: () => invalidateCatalogQueries(queryClient),
  })
}

export function useUpdateDocumentType() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: UpdateDocumentTypeInput & { id: string }) =>
      catalogApi.documentTypes.update(id, data),
    onSuccess: () => invalidateCatalogQueries(queryClient),
  })
}

export function useDeactivateDocumentType() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: catalogApi.documentTypes.deactivate,
    onSuccess: () => invalidateCatalogQueries(queryClient),
  })
}
