import type { ReactNode } from 'react'
import { cn } from '../lib/utils'
import { EmptyState } from './empty-state'
import { LoadingState } from './spinner'

export type DataTableColumn<T> = {
  key: string
  header: string
  className?: string
  render?: (row: T) => ReactNode
}

export type DataTableProps<T> = {
  columns: DataTableColumn<T>[]
  data: T[]
  keyExtractor: (row: T) => string
  loading?: boolean
  emptyTitle?: string
  emptyDescription?: string
  actions?: (row: T) => ReactNode
  label?: string
  className?: string
}

export function DataTable<T>({
  columns,
  data,
  keyExtractor,
  loading,
  emptyTitle,
  emptyDescription,
  actions,
  label = 'Data table',
  className,
}: DataTableProps<T>) {
  const resolvedEmptyTitle = emptyTitle ?? `No ${label.toLowerCase()}`
  const resolvedEmptyDescription =
    emptyDescription ?? `There are no ${label.toLowerCase()} to show yet.`

  if (loading) {
    return <LoadingState label={`Loading ${label}`} />
  }

  if (data.length === 0) {
    return (
      <div
        className={cn(
          'overflow-hidden rounded-2xl border border-[var(--color-border)] bg-white shadow-[var(--shadow-soft)]',
          className
        )}
      >
        <div className="border-b border-[var(--color-border)] bg-[var(--color-primary-soft)]/40 px-4 py-3">
          <h3 className="text-sm font-semibold text-[var(--color-ink)]">{label}</h3>
        </div>
        <EmptyState
          className="rounded-none border-0 shadow-none"
          title={resolvedEmptyTitle}
          description={resolvedEmptyDescription}
        />
      </div>
    )
  }

  return (
    <div className={cn('overflow-x-auto rounded-2xl border border-[var(--color-border)] bg-white shadow-[var(--shadow-soft)]', className)}>
      <div className="border-b border-[var(--color-border)] bg-[var(--color-primary-soft)]/40 px-4 py-3">
        <h3 className="text-sm font-semibold text-[var(--color-ink)]">{label}</h3>
      </div>
      <table className="w-full min-w-[720px] text-sm" aria-label={label}>
        <caption className="sr-only">{label}</caption>
        <thead>
          <tr className="border-b border-[var(--color-border)] bg-[var(--color-primary-soft)]/60">
            {columns.map((column) => (
              <th
                key={column.key}
                scope="col"
                className={cn(
                  'px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--color-muted-foreground)]',
                  column.className
                )}
              >
                {column.header}
              </th>
            ))}
            {actions ? (
              <th
                scope="col"
                className="sticky right-0 bg-[var(--color-primary-soft)] px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-[var(--color-muted-foreground)]"
              >
                Actions
              </th>
            ) : null}
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--color-border)]">
          {data.map((row) => (
            <tr key={keyExtractor(row)} className="transition-colors hover:bg-[var(--color-muted)]/70">
              {columns.map((column) => (
                <td key={column.key} className={cn('px-4 py-3 text-[var(--color-ink)]', column.className)}>
                  {column.render
                    ? column.render(row)
                    : String((row as Record<string, unknown>)[column.key] ?? '—')}
                </td>
              ))}
              {actions ? (
                <td className="sticky right-0 bg-white px-4 py-3 text-right whitespace-nowrap">
                  <div className="flex justify-end gap-1">{actions(row)}</div>
                </td>
              ) : null}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
