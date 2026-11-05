import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { DataTableColumn, SortDirection, SortState } from './types'

interface TableHeaderProps<T> {
  columns: DataTableColumn<T>[]
  sort?: SortState
  onSortChange?: (sort: SortState) => void
  hasRowActions?: boolean
}

function nextDirection(current: SortState | undefined, key: string): SortDirection {
  if (current?.key !== key) return 'asc'
  return current.direction === 'asc' ? 'desc' : 'asc'
}

export function TableHeader<T>({ columns, sort, onSortChange, hasRowActions }: TableHeaderProps<T>) {
  return (
    <thead>
      <tr className="border-b border-border/80">
        {columns.map((column) => {
          const isSorted = sort?.key === column.key
          const SortIcon = !column.sortable
            ? null
            : !isSorted
              ? ArrowUpDown
              : sort?.direction === 'asc'
                ? ArrowUp
                : ArrowDown

          return (
            <th
              key={column.key}
              className={cn(
                'px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground',
                column.className
              )}
            >
              {column.sortable && onSortChange ? (
                <button
                  type="button"
                  className="inline-flex items-center gap-1 transition-premium hover:text-foreground"
                  onClick={() =>
                    onSortChange({
                      key: column.key,
                      direction: nextDirection(sort, column.key),
                    })
                  }
                >
                  {column.header}
                  {SortIcon && <SortIcon className="h-3 w-3 opacity-50" aria-hidden />}
                </button>
              ) : (
                column.header
              )}
            </th>
          )
        })}
        {hasRowActions && (
          <th className="px-4 py-2.5 text-right text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            Actions
          </th>
        )}
      </tr>
    </thead>
  )
}
