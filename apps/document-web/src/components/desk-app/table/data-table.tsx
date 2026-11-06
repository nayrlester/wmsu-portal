import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { TableHeader } from './table-header'
import { TableFilters } from './table-filters'
import { TablePagination } from './table-pagination'
import { TableRowActions } from './table-row-actions'
import type { DataTableColumn, PaginationState, RowAction, SortState } from './types'
import type { TableFilterField } from './table-filters'
import { TableRowsSkeleton } from '@/components/desk-app/ux/list-skeleton'

export interface DataTableProps<T> {
  columns: DataTableColumn<T>[]
  data: T[]
  keyExtractor: (row: T) => string
  loading?: boolean
  emptyMessage?: string
  sort?: SortState
  onSortChange?: (sort: SortState) => void
  filters?: TableFilterField[]
  filterSlot?: ReactNode
  filterSummary?: ReactNode
  pagination?: PaginationState
  onPageChange?: (page: number) => void
  onPageSizeChange?: (size: number) => void
  rowActions?: (row: T) => RowAction[]
  onRowClick?: (row: T) => void
  className?: string
}

export function DataTable<T>({
  columns,
  data,
  keyExtractor,
  loading,
  emptyMessage = 'No records found',
  sort,
  onSortChange,
  filters,
  filterSlot,
  filterSummary,
  pagination,
  onPageChange,
  onPageSizeChange,
  rowActions,
  onRowClick,
  className,
}: DataTableProps<T>) {
  const hasRowActions = Boolean(rowActions)
  const showFilters = Boolean(filters?.length || filterSlot || filterSummary)

  return (
    <div className={cn('space-y-4', className)}>
      {showFilters && (
        <TableFilters fields={filters} summary={filterSummary}>
          {filterSlot}
        </TableFilters>
      )}

      <div className="desk-table-wrap">
        {loading ? (
          <TableRowsSkeleton />
        ) : !data.length ? (
          <div className="p-8 text-center text-sm text-muted-foreground">{emptyMessage}</div>
        ) : (
          <table className="w-full min-w-[640px] text-left text-sm">
            <TableHeader
              columns={columns}
              sort={sort}
              onSortChange={onSortChange}
              hasRowActions={hasRowActions}
            />
            <tbody className="divide-y divide-border">
              {data.map((row) => (
                <tr
                  key={keyExtractor(row)}
                  className={cn(
                    'border-b border-border/40 transition-premium last:border-0 hover:bg-muted/40',
                    onRowClick && 'cursor-pointer'
                  )}
                  onClick={() => onRowClick?.(row)}
                >
                  {columns.map((column) => (
                    <td key={column.key} className={cn('px-4 py-3', column.className)}>
                      {column.render
                        ? column.render(row)
                        : ((row as Record<string, unknown>)[column.key] as ReactNode)}
                    </td>
                  ))}
                  {hasRowActions && (
                    <td className="px-4 py-3 text-right">
                      <TableRowActions actions={rowActions?.(row) ?? []} />
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {pagination && onPageChange && (
        <TablePagination
          pagination={pagination}
          onPageChange={onPageChange}
          onPageSizeChange={onPageSizeChange}
        />
      )}
    </div>
  )
}

export type { DataTableColumn, SortState, PaginationState, RowAction, TableFilterField }
