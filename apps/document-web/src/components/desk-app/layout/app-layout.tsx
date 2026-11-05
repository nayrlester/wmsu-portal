import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export interface AppLayoutProps {
  sidebar: ReactNode
  navbar: ReactNode
  children: ReactNode
  bottomNav?: ReactNode
  sidebarOpen?: boolean
  onSidebarClose?: () => void
  skipLink?: ReactNode
  className?: string
}

export function AppLayout({
  sidebar,
  navbar,
  children,
  bottomNav,
  sidebarOpen = false,
  onSidebarClose,
  skipLink,
  className,
}: AppLayoutProps) {
  return (
    <div className={cn('flex min-h-screen bg-[var(--color-canvas)]', className)}>
      {skipLink}

      {sidebarOpen && onSidebarClose && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-foreground/10 backdrop-blur-[1px] transition-premium lg:hidden"
          aria-label="Close menu"
          onClick={onSidebarClose}
        />
      )}

      <div
        className={cn(
          'fixed inset-y-0 left-0 z-50 transition-transform duration-200 ease-out lg:static lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        {sidebar}
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        {navbar}
        <main
          id="main-content"
          className={cn(
            'flex-1 overflow-auto p-4 animate-page-in lg:p-6 lg:px-8',
            bottomNav && 'pb-safe-nav lg:pb-6'
          )}
        >
          {children}
        </main>
        {bottomNav}
      </div>
    </div>
  )
}
