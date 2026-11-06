import { LayoutGrid } from 'lucide-react'
import { useMemo } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { AppShell, Button, NotificationProvider } from '@wmsu/ui'
import { WmsuLogo } from '@/components/brand/wmsu-logo'
import { useAuthStore } from '@/stores/auth-store'
import { filterNavGroups } from '@/lib/nav-config'
import { clearQueryCache } from '@/lib/query-client'
import { portalHomeUrl, redirectToPortalLogout } from '@/lib/portal'

function returnToPlatforms(opts?: { clearSession?: boolean }) {
  const { accessToken, refreshToken, logout } = useAuthStore.getState()
  if (opts?.clearSession) {
    logout()
    clearQueryCache()
    redirectToPortalLogout()
    return
  }
  if (accessToken && refreshToken) {
    window.location.assign(
      `${portalHomeUrl()}/sso/callback#access_token=${encodeURIComponent(accessToken)}&refresh_token=${encodeURIComponent(refreshToken)}`
    )
    return
  }
  window.location.assign(portalHomeUrl())
}

export function UsisShell({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate()
  const location = useLocation()
  const user = useAuthStore((s) => s.user)

  const groups = useMemo(
    () => filterNavGroups(user?.permissions ?? [], user?.roles ?? []),
    [user?.permissions, user?.roles]
  )

  const navItems = groups.flatMap((group) =>
    group.items.map((item) => ({ ...item, section: group.label }))
  )
  const activeItem = [...navItems]
    .sort((a, b) => b.path.length - a.path.length)
    .find(
      (item) => location.pathname === item.path || location.pathname.startsWith(`${item.path}/`)
    )

  const items = navItems.map((item) => {
    const Icon = item.icon
    return {
      id: item.id,
      label: item.label,
      section: item.section,
      icon: <Icon aria-hidden className="h-4 w-4" strokeWidth={2} />,
      active: activeItem?.id === item.id,
      onClick: () => navigate(item.path),
    }
  })

  const title = activeItem?.label ?? 'USiS'

  return (
    <NotificationProvider>
      <AppShell
        sidebar={{
          brand: (
            <button
              type="button"
              className="space-y-1 text-left"
              onClick={() => returnToPlatforms()}
              title="Back to Platforms"
            >
              <WmsuLogo
                productName="USiS"
                productTagline="Student Information"
                variant="sidebar"
                invert
              />
            </button>
          ),
          items,
          footer: (
            <p className="text-[10px] text-white/40">
              WMSU · University Student Information System
            </p>
          ),
        }}
        header={{
          title,
          subtitle: user?.fullName
            ? `Signed in as ${user.fullName}`
            : (user?.email ?? 'Campus portal'),
          actions: (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="shrink-0 whitespace-nowrap"
              onClick={() => returnToPlatforms()}
            >
              <LayoutGrid className="h-4 w-4" aria-hidden />
              Platforms
            </Button>
          ),
          user: {
            name: user?.fullName || user?.email || 'User',
            email: user?.email ?? '',
            role: user?.roles?.[0] ?? 'USiS',
            items: [
              {
                id: 'platforms',
                label: 'Platforms',
                icon: <LayoutGrid className="h-4 w-4" aria-hidden />,
                onSelect: () => returnToPlatforms(),
              },
            ],
            onSignOut: () => returnToPlatforms({ clearSession: true }),
          },
        }}
      >
        {children}
      </AppShell>
    </NotificationProvider>
  )
}
