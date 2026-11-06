import { Menu } from 'lucide-react'
import { NotificationBell } from '@/components/layout/notification-bell'
import { GlobalSearchBar } from '@/components/search/global-search-bar'
import { useAuthStore } from '@/stores/auth-store'

export function TopBar({ onOpenNav }: { onOpenNav?: () => void }) {
  const user = useAuthStore((s) => s.user)

  return (
    <header className="flex items-center gap-3 px-4 pb-2 pt-6 sm:gap-4 sm:px-6">
      <button
        type="button"
        aria-label="Open menu"
        onClick={onOpenNav}
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-[var(--color-ink)] shadow-[var(--shadow-soft)] lg:hidden"
      >
        <Menu className="h-5 w-5" />
      </button>
      <div className="mx-auto flex w-full max-w-3xl flex-1 items-center">
        <GlobalSearchBar />
      </div>
      <div className="flex items-center gap-3">
        <NotificationBell />
        <div className="hidden items-center gap-2 rounded-full bg-white px-3 py-1.5 shadow-[var(--shadow-soft)] sm:flex">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-primary-soft)] text-xs font-bold text-[var(--color-primary)]">
            {user?.fullName
              ?.split(' ')
              .map((n) => n[0])
              .join('')
              .slice(0, 2)
              .toUpperCase()}
          </div>
          <div className="pr-1 text-sm">
            <p className="font-semibold leading-tight text-[var(--color-ink)]">{user?.fullName}</p>
            <p className="text-[11px] text-[var(--color-muted-foreground)]">{user?.roles[0]}</p>
          </div>
        </div>
      </div>
    </header>
  )
}
