import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { getAppName } from '@librastack/client-config'

export function AppShell({
  children,
  nav,
}: {
  children: ReactNode
  nav?: ReactNode
}) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[var(--color-canvas)]">
      <div className="pointer-events-none absolute -left-28 -top-24 h-80 w-80 rounded-full bg-[#b8b3ff]/55" />
      <div className="pointer-events-none absolute -bottom-28 -right-20 h-96 w-96 rounded-full bg-white/70" />

      <div className="relative mx-auto max-w-4xl px-6 py-10">
        <header className="mb-8 flex flex-wrap items-end justify-between gap-4 animate-fade-up">
          <div>
            <div className="mb-3 flex items-center gap-3">
              <img
                src="/wmsu-seal.png"
                alt="WMSU"
                className="h-12 w-12 shrink-0 rounded-full object-cover ring-2 ring-[var(--color-primary)]/20"
              />
              <span className="text-xl font-bold tracking-tight text-[var(--color-ink)]">WMSU</span>
            </div>
            <p className="text-3xl font-bold tracking-tight text-[var(--color-ink)] sm:text-4xl">
              {getAppName(undefined, 'University Library OPAC')}
            </p>
            <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
              Online Public Access Catalog
            </p>
          </div>
          <nav className="flex items-center gap-3 text-sm font-medium">
            {nav ?? (
              <>
                <Link to="/" className="text-[var(--color-primary)] hover:underline">
                  Search
                </Link>
                <Link to="/queue" className="text-[var(--color-muted-foreground)] hover:text-[var(--color-primary)]">
                  Queue board
                </Link>
              </>
            )}
          </nav>
        </header>
        {children}
      </div>
    </div>
  )
}
