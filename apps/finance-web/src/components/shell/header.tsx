import { useLocation } from 'react-router-dom'
import { LayoutGrid, Menu, LogOut, User } from 'lucide-react'
import { useAuthStore } from '@/stores/auth-store'
import { clearQueryCache } from '@/lib/query-client'
import { portalHomeUrl, redirectToPortalLogout } from '@/lib/portal'
import { useState, useRef, useEffect } from 'react'

const pageTitles: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/budget': 'Budget',
  '/accounting': 'Accounting',
  '/cashier': 'Cashier & AR',
  '/disbursement': 'AP & Disbursement',
  '/procurement': 'Procurement',
  '/pos': 'POS',
  '/reports': 'Reports',
  '/config': 'Finance Config',
  '/tuition': 'Tuition & plans',
  '/organization': 'Organization',
  '/users': 'Users',
  '/roles': 'Roles',
}

interface HeaderProps {
  onMenuToggle: () => void
}

export function Header({ onMenuToggle }: HeaderProps) {
  const { pathname } = useLocation()
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const title = pageTitles[pathname] ?? 'UFMS'

  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!dropdownOpen) return
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [dropdownOpen])

  function handleLogout() {
    logout()
    clearQueryCache()
    redirectToPortalLogout()
  }

  const initials =
    user?.fullName
      ?.split(' ')
      .map((p) => p[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() ?? null

  return (
    <header className="uims-header">
      <div className="flex items-center justify-between gap-4 px-6 pb-2 pt-6">
        <div className="flex items-center gap-3">
          <button
            type="button"
            className="rounded-full p-2 text-[var(--color-muted-foreground)] hover:bg-white hover:text-[var(--color-ink)] lg:hidden"
            onClick={onMenuToggle}
          >
            <Menu className="h-5 w-5" />
          </button>
          <h1 className="text-xl font-bold tracking-tight text-[var(--color-ink)] sm:text-2xl">
            {title}
          </h1>
        </div>

        <div className="flex items-center gap-2">
        <button
          type="button"
          title="Back to Platforms"
          className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-sm font-medium text-[var(--color-ink)] shadow-[var(--shadow-soft)] hover:bg-[var(--color-primary-soft)]"
          onClick={() => {
            const { accessToken, refreshToken } = useAuthStore.getState()
            if (accessToken && refreshToken) {
              window.location.assign(
                `${portalHomeUrl()}/sso/callback#access_token=${encodeURIComponent(accessToken)}&refresh_token=${encodeURIComponent(refreshToken)}`
              )
              return
            }
            window.location.assign(portalHomeUrl())
          }}
        >
          <LayoutGrid className="h-4 w-4" aria-hidden />
          <span className="hidden sm:inline">Platforms</span>
        </button>
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 shadow-[var(--shadow-soft)]"
            onClick={() => setDropdownOpen(!dropdownOpen)}
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-primary-soft)] text-xs font-semibold text-[var(--color-primary)]">
              {initials ?? <User className="h-3.5 w-3.5" />}
            </div>
            <span className="hidden max-w-[140px] truncate text-sm font-medium text-[var(--color-ink)] sm:inline">
              {user?.fullName ?? user?.email ?? 'User'}
            </span>
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 mt-2 w-56 overflow-hidden rounded-2xl bg-white py-1 shadow-[var(--shadow-soft)] animate-fade-up">
              <div className="border-b border-[var(--color-border)] px-4 py-3">
                <p className="text-sm font-medium text-[var(--color-ink)]">
                  {user?.fullName ?? 'User'}
                </p>
                <p className="truncate text-xs text-[var(--color-muted-foreground)]">
                  {user?.email}
                </p>
              </div>
              <button
                type="button"
                className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-[var(--color-muted-foreground)] hover:bg-[var(--color-primary-soft)] hover:text-[var(--color-ink)]"
                onClick={handleLogout}
              >
                <LogOut className="h-3.5 w-3.5" />
                Sign out
              </button>
            </div>
          )}
        </div>
        </div>
      </div>
    </header>
  )
}
