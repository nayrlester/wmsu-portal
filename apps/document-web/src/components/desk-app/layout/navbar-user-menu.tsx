import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronDown, LogOut, Settings, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/auth-store'
import { PERMISSIONS } from '@/shared/constants/env'
import type { AppNavbarUser } from './app-navbar'

export interface NavbarUserMenuProps {
  user: AppNavbarUser
  onLogout?: () => void
  className?: string
}

export function NavbarUserMenu({ user, onLogout, className }: NavbarUserMenuProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const hasPermission = useAuthStore((s) => s.hasPermission)
  const canManageSettings = hasPermission(PERMISSIONS.settingsManage)

  useEffect(() => {
    const handler = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div ref={ref} className={cn('relative', className)}>
      <button
        type="button"
        className="flex items-center gap-2 rounded-lg px-1.5 py-1 transition-premium hover:bg-muted/60"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <div
          className="flex h-7 w-7 items-center justify-center rounded-md bg-muted text-[11px] font-semibold text-foreground"
          aria-hidden
        >
          {user.initials}
        </div>
        <div className="hidden text-left sm:block">
          <p className="max-w-[120px] truncate text-[13px] font-medium leading-tight">{user.displayName}</p>
          {user.roleLabel && <p className="text-[11px] text-muted-foreground">{user.roleLabel}</p>}
        </div>
        <ChevronDown
          className={cn('hidden h-3.5 w-3.5 text-muted-foreground transition-premium sm:block', open && 'rotate-180')}
        />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-50 mt-1.5 w-48 overflow-hidden rounded-lg border border-border/80 bg-card py-1 shadow-sm animate-page-in"
        >
          <div className="border-b border-border/60 px-3 py-2.5">
            <p className="truncate text-sm font-medium">{user.displayName}</p>
            {user.roleLabel && <p className="text-caption">{user.roleLabel}</p>}
          </div>
          <Link
            to="/app/profile"
            role="menuitem"
            className="flex items-center gap-2 px-3 py-2 text-[13px] transition-premium hover:bg-muted/50"
            onClick={() => setOpen(false)}
          >
            <User className="h-3.5 w-3.5 text-muted-foreground" />
            Profile
          </Link>
          {canManageSettings ? (
            <Link
              to="/app/settings"
              role="menuitem"
              className="flex items-center gap-2 px-3 py-2 text-[13px] transition-premium hover:bg-muted/50"
              onClick={() => setOpen(false)}
            >
              <Settings className="h-3.5 w-3.5 text-muted-foreground" />
              Settings
            </Link>
          ) : null}
          {onLogout && (
            <>
              <div className="my-1 border-t border-border/60" />
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start gap-2 rounded-none px-3 text-[13px] text-muted-foreground hover:text-foreground"
                onClick={() => {
                  setOpen(false)
                  onLogout()
                }}
              >
                <LogOut className="h-3.5 w-3.5" />
                Log out
              </Button>
            </>
          )}
        </div>
      )}
    </div>
  )
}
