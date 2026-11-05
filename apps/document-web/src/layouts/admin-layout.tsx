import { Outlet, Link, useLocation, Navigate } from 'react-router-dom'
import {
  LayoutDashboard,
  Building2,
  CreditCard,
  Layers,
  LogOut,
  Menu,
  X,
  ArrowLeft,
} from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/shared/theme-toggle'
import { SkipLink } from '@/components/shared/skip-link'
import { useAuthStore } from '@/stores/auth-store'
import { redirectToPortalLogout } from '@/shared/lib/portal'
import { cn } from '@/lib/utils'
import { APP_LOGO_URL } from '@/shared/constants/branding'

const navItems = [
  { to: '/admin', label: 'Revenue Dashboard', icon: LayoutDashboard, end: true },
  { to: '/admin/tenants', label: 'Tenants', icon: Building2 },
  { to: '/admin/plans', label: 'Plans', icon: Layers },
  { to: '/admin/billing', label: 'Billing', icon: CreditCard },
]

export function AdminLayout() {
  const location = useLocation()
  const { user, logout } = useAuthStore()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  if (!useAuthStore.getState().isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (!user?.isSuperAdmin) {
    return <Navigate to="/app/dashboard" replace />
  }

  return (
    <div className="flex min-h-screen bg-background">
      <SkipLink />

      {sidebarOpen && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          aria-label="Close navigation menu"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-border bg-card transition-transform lg:static lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
        aria-label="Admin navigation"
      >
        <div className="flex h-16 items-center justify-between border-b border-border px-4">
          <div className="min-w-0">
            <Link
              to="/admin"
              className="flex items-center gap-2.5"
              onClick={() => setSidebarOpen(false)}
            >
              <img
                src={APP_LOGO_URL}
                alt=""
                width={32}
                height={32}
                className="h-8 w-8 shrink-0 rounded-lg object-contain"
                decoding="async"
              />
              <span className="min-w-0">
                <span className="block text-base font-semibold tracking-tight">CDTS Admin</span>
                <span className="block text-xs text-muted-foreground">Platform administration</span>
              </span>
            </Link>
          </div>
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setSidebarOpen(false)} aria-label="Close menu">
            <X className="h-5 w-5" />
          </Button>
        </div>
        <nav className="flex-1 space-y-1 p-3">
          {navItems.map(({ to, label, icon: Icon, end }) => {
            const active = end ? location.pathname === to : location.pathname.startsWith(to)
            return (
              <Link
                key={to}
                to={to}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  'flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors',
                  active
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                )}
              >
                <Icon className="h-4 w-4 shrink-0" aria-hidden />
                {label}
              </Link>
            )
          })}
          <Link
            to="/app/dashboard"
            onClick={() => setSidebarOpen(false)}
            className="mt-4 flex items-center gap-3 rounded-md border border-dashed border-border px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Tenant App
          </Link>
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-border bg-card/80 px-4 backdrop-blur-md lg:px-6">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open navigation menu"
          >
            <Menu className="h-5 w-5" />
          </Button>
          <div className="flex-1" />
          <ThemeToggle />
          <span className="hidden max-w-[180px] truncate text-sm text-muted-foreground sm:inline">
            {user?.fullName ?? user?.email}
          </span>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              logout()
              redirectToPortalLogout()
            }}
            aria-label="Sign out"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </header>
        <main id="main-content" className="flex-1 overflow-auto p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
