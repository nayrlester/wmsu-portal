import { Menu, X } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '../lib/utils'
import { Button } from './button'
import { UserMenu, type UserMenuProps } from './user-menu'

export type AppHeaderProps = {
  title?: string
  subtitle?: string
  onMenuClick?: () => void
  menuOpen?: boolean
  actions?: ReactNode
  user?: UserMenuProps
  className?: string
}

export function AppHeader({ title, subtitle, onMenuClick, menuOpen, actions, user, className }: AppHeaderProps) {
  return (
    <header
      className={cn(
        'sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-[var(--color-border)] bg-white/90 px-4 py-3 backdrop-blur md:px-6',
        className
      )}
    >
      <div className="flex min-w-0 items-center gap-3">
        {onMenuClick ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={onMenuClick}
            aria-label={menuOpen ? 'Close navigation' : 'Open navigation'}
          >
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        ) : null}
        <div className="min-w-0">
          {title ? <h1 className="truncate text-base font-semibold text-[var(--color-ink)] md:text-lg">{title}</h1> : null}
          {subtitle ? <p className="truncate text-xs text-[var(--color-muted-foreground)] md:text-sm">{subtitle}</p> : null}
        </div>
      </div>
      <div className="flex items-center gap-2">
        {actions}
        {user ? <UserMenu {...user} /> : null}
      </div>
    </header>
  )
}
