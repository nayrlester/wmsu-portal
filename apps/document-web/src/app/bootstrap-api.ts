import { useAuthStore } from '@/shared/store/auth-store'
import { useTenantStore } from '@/shared/store/tenant-store'
import { tokenStorage } from '@/shared/lib/token-storage'
import { syncUserTenantFromOrganization, bootstrapSuperAdminWorkspace } from '@/shared/lib/tenant-session'
import { env } from '@/shared/constants/env'
import { tenantContext } from '@/api/lib/tenant-context'
import { sessionManager } from '@/api/lib/session-manager'

/** Wire API layer to application session + tenant stores (call once at startup) */
export function bootstrapApiLayer(): void {
  tenantContext.registerResolver(() => {
    syncUserTenantFromOrganization()
    bootstrapSuperAdminWorkspace()

    const user = useAuthStore.getState().user
    if (user?.tenantId) return user.tenantId

    const organization = useTenantStore.getState().organization
    if (organization?.id) return organization.id

    // Authenticated users without a tenant (e.g. super admin) must not send a demo tenant header.
    if (user) return null

    return env.defaultTenantId || null
  })

  useAuthStore.persist.onFinishHydration(() => {
    syncUserTenantFromOrganization()
  })

  useTenantStore.persist.onFinishHydration(() => {
    syncUserTenantFromOrganization()
  })

  sessionManager.registerLogoutHandler(() => {
    tokenStorage.clear()
    tenantContext.setImpersonatedTenantId(null)
    useAuthStore.getState().logout()
    useTenantStore.setState({
      organization: null,
      organizationName: null,
      logoUrl: null,
      primaryColor: null,
    })
    const portal =
      (import.meta.env.VITE_PORTAL_URL as string | undefined)?.trim()?.replace(/\/$/, '') ||
      'http://127.0.0.1:5173'
    window.location.href = `${portal}/login`
  })
}
