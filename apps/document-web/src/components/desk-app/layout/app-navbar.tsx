import type { ReactNode } from 'react'
import { Menu, PanelLeftClose, PanelLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { NavbarUserMenu } from '@/components/desk-app/layout/navbar-user-menu'
import { cn } from '@/lib/utils'

export interface AppNavbarUser {
  displayName: string
  roleLabel?: string
  initials: string
}

export interface AppNavbarProps {
  user?: AppNavbarUser
  organizationLabel?: string
  searchSlot?: ReactNode
  notificationSlot?: ReactNode
  actionsSlot?: ReactNode
  onMenuClick?: () => void
  onSidebarToggle?: () => void
  sidebarCollapsed?: boolean
  onLogout?: () => void
  className?: string
}

export function AppNavbar({
  user,
  organizationLabel,
  searchSlot,
  notificationSlot,
  actionsSlot,
  onMenuClick,
  onSidebarToggle,
  sidebarCollapsed,
  onLogout,
  className,
}: AppNavbarProps) {
  return (
    <header
      className={cn(
        'sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-border/60 bg-desk-header px-3 pt-safe-top backdrop-blur-md sm:gap-3 sm:px-4 lg:px-5',
        className
      )}
    >
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden"
        onClick={onMenuClick}
        aria-label="Open menu"
      >
        <Menu className="h-4 w-4" />
      </Button>

      {onSidebarToggle && (
        <Button
          variant="ghost"
          size="icon"
          className="hidden lg:inline-flex"
          onClick={onSidebarToggle}
          aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {sidebarCollapsed ? (
            <PanelLeft className="h-4 w-4" />
          ) : (
            <PanelLeftClose className="h-4 w-4" />
          )}
        </Button>
      )}

      {organizationLabel && (
        <div className="hidden min-w-0 md:block">
          <p className="truncate text-sm font-medium tracking-tight">{organizationLabel}</p>
        </div>
      )}

      {searchSlot && <div className="mx-auto hidden w-full max-w-md flex-1 lg:block">{searchSlot}</div>}

      <div className="ml-auto flex items-center gap-1">
        {searchSlot && <div className="lg:hidden">{searchSlot}</div>}
        {notificationSlot}
        {actionsSlot}
        {user && <NavbarUserMenu user={user} onLogout={onLogout} />}
      </div>
    </header>
  )
}
