import { Link } from 'react-router-dom'
import { LayoutDashboard } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { BrandLogo } from '@/components/shared/brand-logo'
import { ThemeToggle } from '@/components/shared/theme-toggle'
import { NavbarUserMenu } from '@/components/desk-app/layout/navbar-user-menu'
import { useAuthStore } from '@/stores/auth-store'
import { ROUTES } from '@/shared/constants/env'

export function PublicPageHeader() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const user = useAuthStore((state) => state.user)
  const logout = useAuthStore((state) => state.logout)

  // const workspaceHref = user?.isSuperAdmin ? ROUTES.adminRoot : ROUTES.dashboard
  const workspaceHref = ROUTES.dashboard
  const initials = (user?.fullName ?? user?.email ?? 'U')
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-card/90 pt-safe-top backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-2 px-4 sm:h-16 sm:gap-3 sm:px-6">
        <BrandLogo to={isAuthenticated ? workspaceHref : '/'} className="min-w-0 shrink" />

        <div className="flex shrink-0 items-center gap-0.5 sm:gap-2">
          <ThemeToggle />
          {isAuthenticated && user ? (
            <>
              <Link to={workspaceHref}>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-9 gap-2 px-2.5 text-xs sm:px-3 sm:text-sm"
                >
                  <LayoutDashboard className="h-4 w-4 shrink-0" aria-hidden />
                  <span className="hidden min-[420px]:inline">Dashboard</span>
                </Button>
              </Link>
              <NavbarUserMenu
                user={{
                  displayName: user.fullName ?? user.email,
                  roleLabel: user.roles?.[0]?.name ?? (user.isSuperAdmin ? 'Super Admin' : 'Member'),
                  initials,
                }}
                onLogout={logout}
              />
            </>
          ) : (
            <>
              <Link to={ROUTES.login}>
                <Button variant="ghost" size="sm" className="h-9 px-2.5 text-xs sm:px-3 sm:text-sm">
                  Sign in
                </Button>
              </Link>
              {/* <Link to={ROUTES.register} className="hidden sm:inline-flex">
                <Button size="sm">Get started</Button>
              </Link> */}
            </>
          )}
        </div>
      </div>
    </header>
  )
}
