import { LogOut, Menu, Package } from 'lucide-react'
import { useAuthStore } from '@/stores/auth-store'
import { clearQueryCache } from '@/lib/query-client'
import { redirectToPortalSignIn } from '@/lib/portal'

export function AppHeader({ onMenuClick }: { onMenuClick: () => void }) {
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)

  const handleLogout = () => {
    logout()
    clearQueryCache()
    redirectToPortalSignIn()
  }

  return (
    <header className="uims-header flex h-14 items-center gap-4 px-4 sm:px-6">
      <button
        type="button"
        onClick={onMenuClick}
        className="lg:hidden rounded-lg p-2 text-slate-500 hover:bg-slate-100"
      >
        <Menu className="h-5 w-5" />
      </button>

      <div className="flex items-center gap-2 lg:hidden">
        <Package className="h-5 w-5 text-slate-700" />
        <span className="text-sm font-bold text-slate-900">UIMS</span>
      </div>

      <div className="flex-1" />

      <div className="flex items-center gap-3">
        <span className="hidden text-sm text-slate-600 sm:block">
          {user?.fullName ?? user?.email}
        </span>
        <button
          type="button"
          onClick={handleLogout}
          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
        >
          <LogOut className="h-4 w-4" />
          <span className="hidden sm:inline">Logout</span>
        </button>
      </div>
    </header>
  )
}
