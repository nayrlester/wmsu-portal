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
  emptyTitle = 'No records found',
  emptyDescription,
  actions,
  label = 'Data table',
  className,
}: DataTableProps<T>) {
  if (loading) {
    return <LoadingState label={`Loading ${label}`} />
  }

  if (data.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />
  }

  return (
    <div className={cn('overflow-x-auto rounded-2xl border border-[var(--color-border)] bg-white shadow-[var(--shadow-soft)]', className)}>
      <table className="w-full min-w-[640px] text-sm" aria-label={label}>
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
              <th scope="col" className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-[var(--color-muted-foreground)]">
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
                <td className="px-4 py-3 text-right">
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
