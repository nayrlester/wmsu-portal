import { Link, useLocation } from 'react-router-dom'
import { LogOut, Shield, LayoutGrid } from 'lucide-react'
import { useAuthStore } from '@/stores/auth-store'
import clsx from 'clsx'
import { WmsuLogo } from '@/components/brand/wmsu-logo'
import { useState } from 'react'

export function AppHeader() {
  const location = useLocation()
  const user = useAuthStore((s) => s.user)
  const isAdmin = useAuthStore((s) => s.isAdmin())
  const [signingOut, setSigningOut] = useState(false)

  function handleLogout() {
    if (signingOut) return
    setSigningOut(true)
    window.location.assign('/logout')
  }

  return (
    <header className="border-b border-[#dde1f5] bg-white/80 backdrop-blur-sm">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
        <WmsuLogo
          productName="WMSU Portal"
          productTagline="Campus Information Systems"
          variant="header"
          className="min-w-0"
        />

        <nav className="flex items-center gap-2">
          <Link
            to="/"
            className={clsx(
              'inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition',
              location.pathname === '/'
                ? 'bg-[#f3f4ff] text-[#635bff]'
                : 'text-[#6b6f8c] hover:bg-[#f3f4ff] hover:text-[#12122a]'
            )}
          >
            <LayoutGrid className="h-4 w-4" />
            Platforms
          </Link>
          {isAdmin && (
            <Link
              to="/admin"
              className={clsx(
                'inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition',
                location.pathname.startsWith('/admin')
                  ? 'bg-[#f3f4ff] text-[#635bff]'
                  : 'text-[#6b6f8c] hover:bg-[#f3f4ff] hover:text-[#12122a]'
              )}
            >
              <Shield className="h-4 w-4" />
              Admin
            </Link>
          )}
          <div className="ml-2 hidden items-center gap-3 border-l border-[#dde1f5] pl-4 sm:flex">
            <div className="text-right">
              <p className="text-sm font-medium text-[#12122a]">{user?.fullName ?? user?.email}</p>
              <p className="text-xs text-[#6b6f8c]">{user?.email}</p>
            </div>
            <button
              type="button"
              onClick={() => void handleLogout()}
              disabled={signingOut}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[#f3f4ff] text-[#6b6f8c] transition hover:bg-[#635bff] hover:text-white disabled:opacity-60"
              title={signingOut ? 'Signing out…' : 'Sign out of all platforms'}
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </nav>
      </div>
    </header>
  )
}
