import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import { Outlet, Navigate } from 'react-router-dom'
import { LayoutGrid } from 'lucide-react'
import { SkipLink } from '@/components/shared/skip-link'
import { ThemeToggle } from '@/components/shared/theme-toggle'
import { GlobalSearch } from '@/components/desk/global-search'
import { NotificationCenter } from '@/components/desk/notification-center'
import { AppLayout, AppNavbar, AppSidebar } from '@/components/desk-app/layout'
import { MobileBottomNav } from '@/components/desk-app/responsive/mobile-bottom-nav'
import { Button } from '@/components/ui/button'
import { buildAppNavGroups, buildMobileNavItems } from '@/config/app-navigation'
import { PERMISSIONS } from '@/shared/constants/env'
import { APP_BRAND_NAME } from '@/shared/constants/branding'
import { isAdminOrSuperAdmin } from '@/shared/lib/admin-access'
import { useAuthStore } from '@/stores/auth-store'
import { useTenantStore } from '@/stores/tenant-store'
import { useNotificationUnread } from '@/hooks/use-notifications'
import { useRealtimeSync } from '@/hooks/use-realtime'
import { authApi, permissionsApi, settingsApi } from '@/lib/api'

import { bootstrapSuperAdminWorkspace } from '@/shared/lib/tenant-session'
import { redirectToPortalLogout, returnToPlatforms } from '@/shared/lib/portal'

const AIAssistantRoot = lazy(() =>
  import('@/features/copilot/components/ai-assistant-root').then((module) => ({
    default: module.AIAssistantRoot,
  }))
)

export function DeskAppLayout() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const user = useAuthStore((s) => s.user)
  const logoutStore = useAuthStore((s) => s.logout)
  const logout = () => {
    logoutStore()
    redirectToPortalLogout()
  }
  const setUser = useAuthStore((s) => s.setUser)
  const setPermissions = useAuthStore((s) => s.setPermissions)
  const setPermissionsLoading = useAuthStore((s) => s.setPermissionsLoading)
  const setPermissionsError = useAuthStore((s) => s.setPermissionsError)
  const permissions = useAuthStore((s) => s.permissions)
  const permissionsReady = useAuthStore((s) => s.permissionsReady)
  const hasPermission = useAuthStore((s) => s.hasPermission)
  const { organizationName, logoUrl, setOrganization } = useTenantStore()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  useMemo(() => {
    bootstrapSuperAdminWorkspace()
  }, [user?.id, user?.tenantId, user?.isSuperAdmin])

  const { data: unreadData } = useNotificationUnread()

  useRealtimeSync()

  useEffect(() => {
    if (!isAuthenticated || !user?.id) return

    bootstrapSuperAdminWorkspace()

    let cancelled = false
    const alreadyReady = useAuthStore.getState().permissionsReady
    // Don't wipe already-hydrated SSO permissions (avoids Dashboard-only flash).
    if (!user.isSuperAdmin && !alreadyReady) {
      setPermissionsLoading()
    }

    // Single profile call — permissions are already merged server-side (incl. platform JWT).
    authApi
      .profile()
      .then((profile) => {
        if (cancelled) return
        setUser({
          id: profile.id,
          email: profile.email,
          fullName: profile.fullName,
          tenantId: profile.tenantId,
          isSuperAdmin: profile.isSuperAdmin,
          roles: profile.roles,
        })
        const nextPermissions = profile.permissions ?? profile.platformPermissions
        if (Array.isArray(nextPermissions)) {
          setPermissions(nextPermissions)
        } else if (!useAuthStore.getState().permissionsReady) {
          void permissionsApi.mine().then(({ permissions: rolePermissions }) => {
            if (!cancelled) setPermissions(Array.isArray(rolePermissions) ? rolePermissions : [])
          })
        }
      })
      .catch(() => {
        if (!cancelled) setPermissionsError()
      })

    if (!organizationName) {
      settingsApi.organization().then((data) => {
        if (!cancelled) setOrganization(data)
      }).catch(() => {})
    }

    return () => {
      cancelled = true
    }
  }, [
    isAuthenticated,
    user?.id,
    user?.isSuperAdmin,
    organizationName,
    setUser,
    setPermissions,
    setPermissionsLoading,
    setPermissionsError,
    setOrganization,
  ])

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  const initials = (user?.fullName ?? user?.email ?? 'U')
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  const unread = unreadData?.unreadCount ?? 0
  const canViewNotifications =
    Boolean(user?.isSuperAdmin) || (permissionsReady && hasPermission(PERMISSIONS.documentsCreate))
  const navOptions = {
    unread: canViewNotifications ? unread : 0,
    isSuperAdmin: user?.isSuperAdmin ?? false,
    isAdmin: isAdminOrSuperAdmin(user),
  }
  // While permissions hydrate, only show universal items (Dashboard) — never a full unfiltered menu.
  const navPermissions = permissionsReady || user?.isSuperAdmin ? permissions : []

  return (
    <AppLayout
      skipLink={<SkipLink />}
      sidebarOpen={sidebarOpen}
      onSidebarClose={() => setSidebarOpen(false)}
      bottomNav={<MobileBottomNav items={buildMobileNavItems(navPermissions, navOptions)} />}
      sidebar={
        <AppSidebar
          groups={buildAppNavGroups(navPermissions, navOptions)}
          brandName={APP_BRAND_NAME}
          logoUrl={logoUrl}
          collapsed={sidebarCollapsed}
          // showAdminLink={user?.isSuperAdmin}
          showAdminLink={false}
          onNavigate={() => setSidebarOpen(false)}
        />
      }
      navbar={
        <AppNavbar
          searchSlot={<GlobalSearch />}
          notificationSlot={canViewNotifications ? <NotificationCenter /> : undefined}
          actionsSlot={
            <>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="hidden sm:inline-flex"
                title="Back to Platforms"
                onClick={() => {
                  const tokens = useAuthStore.getState().tokens
                  returnToPlatforms({
                    accessToken: tokens?.accessToken,
                    refreshToken: tokens?.refreshToken,
                  })
                }}
              >
                <LayoutGrid className="h-4 w-4" aria-hidden />
                Platforms
              </Button>
              <ThemeToggle />
            </>
          }
          user={{
            displayName: user?.fullName ?? user?.email ?? 'User',
            roleLabel: user?.roles?.[0]?.name ?? (user?.isSuperAdmin ? 'Super Admin' : 'Member'),
            initials,
          }}
          onMenuClick={() => setSidebarOpen(true)}
          onSidebarToggle={() => setSidebarCollapsed((value) => !value)}
          sidebarCollapsed={sidebarCollapsed}
          onLogout={logout}
        />
      }
    >
      <Outlet />
      <Suspense fallback={null}>
        <AIAssistantRoot />
      </Suspense>
    </AppLayout>
  )
}
