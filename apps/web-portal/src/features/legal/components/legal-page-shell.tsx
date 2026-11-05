import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { AppFooter } from '@/components/layout/app-footer'
import { AppHeader } from '@/components/layout/app-header'
import { useAuthStore } from '@/stores/auth-store'
import clsx from 'clsx'

type LegalPageShellProps = {
  title: string
  subtitle: string
  children: ReactNode
  /** `article` = narrow prose card (Terms/Privacy). `hub` = wider resource layout (Support). */
  variant?: 'article' | 'hub'
}

export function LegalPageShell({
  title,
  subtitle,
  children,
  variant = 'article',
}: LegalPageShellProps) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const homeHref = isAuthenticated ? '/' : '/login'
  const isHub = variant === 'hub'

  return (
    <div className="flex min-h-screen flex-col bg-[#e6e9ff]">
      {isAuthenticated ? (
        <AppHeader />
      ) : (
        <header className="border-b border-[#dde1f5] bg-white/80 backdrop-blur-sm">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
            <Link to={homeHref} className="flex min-w-0 items-center gap-3">
              <img
                src="/identity-mark.svg"
                alt=""
                className="h-10 w-10 shrink-0 rounded-full ring-2 ring-[#635bff]/25"
              />
              <p className="truncate text-base font-bold leading-tight tracking-tight text-[#12122a] sm:text-lg">
                University Platform Access Service
              </p>
            </Link>
            <Link
              to={homeHref}
              className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium text-[#6b6f8c] transition hover:bg-[#f3f4ff] hover:text-[#12122a]"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to sign in
            </Link>
          </div>
        </header>
      )}

      <main
        className={clsx(
          'mx-auto w-full flex-1 px-4 py-10 sm:px-6',
          isHub ? 'max-w-6xl' : 'max-w-3xl'
        )}
      >
        <div className="animate-fade-up mb-8">
          {isAuthenticated && (
            <Link
              to="/"
              className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-[#635bff] transition hover:text-[#5249f0]"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to platforms
            </Link>
          )}
          <h1 className="text-3xl font-bold tracking-tight text-[#12122a] sm:text-4xl">{title}</h1>
          <p className={clsx('mt-2 text-[#6b6f8c]', isHub ? 'max-w-2xl text-base' : 'text-sm')}>
            {subtitle}
          </p>
        </div>

        {isHub ? (
          <div className="animate-fade-up space-y-10">{children}</div>
        ) : (
          <article className="ui-card animate-fade-up space-y-6 px-6 py-8 text-sm leading-relaxed text-[#6b6f8c] sm:px-8">
            {children}
          </article>
        )}
      </main>

      <AppFooter />
    </div>
  )
}
