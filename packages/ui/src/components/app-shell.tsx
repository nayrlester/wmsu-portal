import { useState, type ReactNode } from 'react'
import { cn } from '../lib/utils'
import { AppHeader, type AppHeaderProps } from './app-header'
import { AppSidebar, type AppSidebarProps } from './app-sidebar'

export type AppShellProps = {
  sidebar: Omit<AppSidebarProps, 'className'>
  header?: Omit<AppHeaderProps, 'onMenuClick' | 'menuOpen'>
  children: ReactNode
  className?: string
}

export function AppShell({ sidebar, header, children, className }: AppShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className={cn('min-h-screen bg-canvas', className)}>
      <div className="flex min-h-screen">
        <div className="hidden bg-sidebar lg:sticky lg:top-0 lg:block lg:h-screen lg:shrink-0">
          <AppSidebar {...sidebar} />
        </div>

        {mobileOpen ? (
          <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="Navigation">
            <div className="absolute inset-y-0 left-0 z-10 w-72 bg-sidebar shadow-xl">
              <AppSidebar {...sidebar} />
            </div>
            <button
              type="button"
              className="absolute inset-y-0 left-72 right-0 bg-[var(--color-ink)]/40"
              aria-label="Close navigation overlay"
              onClick={() => setMobileOpen(false)}
            />
          </div>
        ) : null}

        <div className="flex min-w-0 flex-1 flex-col">
          <AppHeader
            {...header}
            menuOpen={mobileOpen}
            onMenuClick={() => setMobileOpen((open) => !open)}
          />
          <main className="flex-1 px-4 py-5 md:px-6 md:py-6">{children}</main>
        </div>
      </div>
    </div>
  )
}
