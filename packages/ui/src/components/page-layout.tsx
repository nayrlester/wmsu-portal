import type { ReactNode } from 'react'
import { cn } from '../lib/utils'
import { Breadcrumb, type BreadcrumbItem } from './breadcrumb'

export type PageHeaderProps = {
  title: string
  description?: string
  breadcrumbs?: BreadcrumbItem[]
  actions?: ReactNode
  className?: string
}

export function PageHeader({ title, description, breadcrumbs, actions, className }: PageHeaderProps) {
  return (
    <div className={cn('mb-6 space-y-3', className)}>
      {breadcrumbs?.length ? <Breadcrumb items={breadcrumbs} /> : null}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h2 className="font-display text-2xl font-semibold tracking-tight text-[var(--color-ink)]">{title}</h2>
          {description ? <p className="max-w-3xl text-sm text-[var(--color-muted-foreground)]">{description}</p> : null}
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
    </div>
  )
}

export type PageLayoutProps = {
  header?: PageHeaderProps
  toolbar?: ReactNode
  children: ReactNode
  className?: string
}

export function PageLayout({ header, toolbar, children, className }: PageLayoutProps) {
  return (
    <div className={cn('mx-auto w-full max-w-7xl space-y-5', className)}>
      {header ? <PageHeader {...header} /> : null}
      {toolbar}
      {children}
    </div>
  )
}

/** Compact status card used by infra health screens and dashboards. */
export function StatusCard({
  label,
  value,
  ok,
}: {
  label: string
  value: string
  ok?: boolean
}) {
  return (
    <div
      className={cn(
        'rounded-2xl border bg-white px-4 py-3 shadow-[var(--shadow-soft)]',
        ok === false ? 'border-[var(--color-destructive)]' : 'border-[var(--color-border)]'
      )}
    >
      <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-muted-foreground)]">{label}</p>
      <p className={cn('mt-1 text-sm font-semibold', ok === false ? 'text-[var(--color-destructive)]' : 'text-[var(--color-ink)]')}>
        {value}
      </p>
    </div>
  )
}
