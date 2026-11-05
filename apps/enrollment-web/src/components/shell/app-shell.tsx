import { useState } from 'react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { Sidebar } from './sidebar'
import { Header } from './header'

export function AppShell({ children }: { children: ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="flex min-h-screen bg-[var(--color-canvas)]">
      <a href="#main-content" className="uims-skip-link">
        Skip to content
      </a>

      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-[#2f2a6b]/35 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-[260px] transition-transform duration-200 lg:sticky lg:top-0 lg:h-screen lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
        aria-label="Primary"
      >
        <Sidebar onClose={() => setSidebarOpen(false)} />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <Header onMenuToggle={() => setSidebarOpen((v) => !v)} />
        <main
          id="main-content"
          tabIndex={-1}
          className="flex-1 overflow-y-auto px-6 pb-8 pt-4 outline-none"
        >
          {children}
        </main>
      </div>
    </div>
  )
}
