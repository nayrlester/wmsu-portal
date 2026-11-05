import type { ReactNode } from 'react'
import { cn } from '../lib/utils'

export type FacadeShellLink = {
  href: string
  label: string
  variant?: 'primary' | 'secondary'
}

export type FacadeShellProps = {
  title: string
  description: ReactNode
  moduleName?: string | null
  phase?: string | null
  torSystem?: string | null
  healthLabel: string
  healthOk?: boolean | null
  upstream?: string | null
  error?: string | null
  links: FacadeShellLink[]
  className?: string
}

export function FacadeShell({
  title,
  description,
  moduleName,
  phase,
  torSystem,
  healthLabel,
  healthOk,
  upstream,
  error,
  links,
  className,
}: FacadeShellProps) {
  return (
    <main className={cn('wmsu-shell-canvas relative z-0 text-[var(--color-ink)]', className)}>
      <div className="relative z-10 mx-auto flex min-h-screen max-w-5xl flex-col gap-8 px-6 py-10 sm:px-10">
        <header className="animate-fade-up space-y-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--color-wmsu-navy)]/70">
            WMSU CIS · Platform shell
          </p>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-[var(--color-ink)] sm:text-4xl">
            {title}
          </h1>
          <p className="max-w-2xl text-sm leading-relaxed text-[var(--color-muted-foreground)]">
            {description}
          </p>
        </header>

        {error ? (
          <p className="animate-fade-up animate-fade-up-delay-1 rounded-2xl border border-[var(--color-destructive)]/30 bg-[var(--color-primary-soft)] px-4 py-3 text-sm text-[var(--color-destructive)]">
            {error}
          </p>
        ) : null}

        <section className="grid max-w-3xl gap-4 sm:grid-cols-2">
          <article className="ui-card animate-fade-up animate-fade-up-delay-1 p-5 transition duration-300 hover:-translate-y-0.5 hover:shadow-[var(--shadow-card)]">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--color-muted-foreground)]">
              Module
            </h2>
            <p className="mt-3 font-display text-xl font-semibold">{moduleName ?? '…'}</p>
            <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">{phase ?? 'loading'}</p>
            {torSystem ? (
              <p className="mt-2 inline-flex rounded-full bg-[var(--color-muted)] px-2.5 py-1 text-xs font-medium text-[var(--color-wmsu-navy)]">
                {torSystem}
              </p>
            ) : null}
          </article>

          <article className="ui-card animate-fade-up animate-fade-up-delay-2 p-5 transition duration-300 hover:-translate-y-0.5 hover:shadow-[var(--shadow-card)]">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--color-muted-foreground)]">
              Upstream
            </h2>
            <p className="mt-3 flex items-center gap-2 font-display text-xl font-semibold">
              <span
                className={cn(
                  'wmsu-status-dot',
                  healthOk === true && 'text-[var(--color-success)] wmsu-status-dot-pulse',
                  healthOk === false && 'text-[var(--color-destructive)]',
                  healthOk == null && 'text-[var(--color-muted-foreground)]'
                )}
                aria-hidden
              />
              <span
                className={cn(
                  healthOk === true && 'text-[var(--color-success)]',
                  healthOk === false && 'text-[var(--color-destructive)]'
                )}
              >
                {healthLabel}
              </span>
            </p>
            <p className="mt-2 break-all text-xs text-[var(--color-muted-foreground)]">{upstream ?? '—'}</p>
          </article>
        </section>

        <div className="animate-fade-up animate-fade-up-delay-3 flex flex-wrap gap-3">
          {links.map((link) => (
            <a
              key={link.href + link.label}
              href={link.href}
              className={cn(
                'inline-flex items-center justify-center rounded-xl px-4 py-2.5 text-sm font-semibold transition duration-200',
                link.variant === 'secondary'
                  ? 'border border-[var(--color-border)] bg-white text-[var(--color-ink)] hover:bg-[var(--color-primary-soft)]'
                  : 'wmsu-btn-gradient text-white shadow-[var(--shadow-soft)] hover:-translate-y-0.5'
              )}
            >
              {link.label}
            </a>
          ))}
        </div>
      </div>
    </main>
  )
}
