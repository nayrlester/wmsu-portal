import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { Spinner } from './spinner'
import { EmptyState } from './empty-state'

export interface Column<T> {
  key: string
  header: string
  render?: (item: T) => ReactNode
  className?: string
}

interface DataTableProps<T> {
  columns: Column<T>[]
  data: T[]
  keyExtractor: (item: T) => string
  loading?: boolean
  emptyIcon?: ReactNode
  emptyTitle?: string
  emptyDescription?: string
  actions?: (item: T) => ReactNode
  /** Accessible name announced for the table */
  label?: string
}

export function DataTable<T>({
  columns,
  data,
  keyExtractor,
  loading,
  emptyIcon,
  emptyTitle,
  emptyDescription,
  actions,
  label = 'Data table',
}: DataTableProps<T>) {
  if (loading) {
    return (
      <div className="flex justify-center py-16" role="status" aria-live="polite" aria-busy="true">
        <Spinner className="h-6 w-6" />
        <span className="sr-only">Loading {label}</span>
      </div>
    )
  }

  if (data.length === 0) {
    return (
      <div role="status" aria-live="polite">
        <EmptyState icon={emptyIcon} title={emptyTitle ?? 'No records found'} description={emptyDescription} />
      </div>
    )
  }

  const allColumns = actions
    ? [...columns, { key: '__actions', header: '', className: 'w-24 text-right' } as Column<T>]
    : columns

  return (
    <div className="overflow-x-auto rounded-[1.5rem] bg-white shadow-[var(--shadow-soft)]">
      <table className="w-full text-sm" aria-label={label}>
        <caption className="sr-only">{label}</caption>
        <thead>
          <tr className="border-b border-[var(--color-border)] bg-[var(--color-primary-soft)]/70">
            {allColumns.map((col) => (
              <th
                key={col.key}
                className={cn(
                  'px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--color-muted-foreground)]',
                  col.className,
                )}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--color-border)]">
          {data.map((item) => (
            <tr key={keyExtractor(item)} className="transition-colors hover:bg-[var(--color-primary-soft)]/50">
              {columns.map((col) => (
                <td key={col.key} className={cn('px-4 py-3 text-[var(--color-ink)]', col.className)}>
                  {col.render
                    ? col.render(item)
                    : String((item as Record<string, unknown>)[col.key] ?? '—')}
                </td>
              ))}
              {actions && (
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-1">{actions(item)}</div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
