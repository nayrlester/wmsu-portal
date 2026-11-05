import { useAuthStore } from '@/shared/store/auth-store'
import { useTenantStore } from '@/shared/store/tenant-store'
import { tenantContext } from '@/api/lib/tenant-context'

/** Resolve tenant ID for API headers from auth + persisted organization. */
export function resolveActiveTenantId(): string | null {
  const user = useAuthStore.getState().user
  if (user?.tenantId) return user.tenantId

  const organization = useTenantStore.getState().organization
  return organization?.id ?? null
}

/** Keep auth user aligned with persisted organization after register / refresh. */
export function syncUserTenantFromOrganization(): void {
  const user = useAuthStore.getState().user
  const organization = useTenantStore.getState().organization

  if (user && !user.tenantId && organization?.id) {
    useAuthStore.getState().setUser({ ...user, tenantId: organization.id })
  }
}

/** Super admins without a tenant use the persisted demo organization for workspace API calls. */
export function bootstrapSuperAdminWorkspace(): void {
  const user = useAuthStore.getState().user
  if (!user?.isSuperAdmin) return

  if (user.tenantId) {
    tenantContext.setImpersonatedTenantId(null)
    return
  }

  const organization = useTenantStore.getState().organization
  if (organization?.id) {
    tenantContext.setImpersonatedTenantId(organization.id)
  }
}
