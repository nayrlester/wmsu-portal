import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { PaginationState } from './types'

export interface TablePaginationProps {
  pagination: PaginationState
  onPageChange: (page: number) => void
  onPageSizeChange?: (size: number) => void
  pageSizeOptions?: number[]
  className?: string
}

export function TablePagination({
  pagination,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 20, 25, 50, 100],
  className,
}: TablePaginationProps) {
  const totalPages = Math.max(1, Math.ceil(pagination.total / pagination.pageSize))
  const from = pagination.total === 0 ? 0 : (pagination.page - 1) * pagination.pageSize + 1
  const to = Math.min(pagination.page * pagination.pageSize, pagination.total)
  const sizes = pageSizeOptions.includes(pagination.pageSize)
    ? pageSizeOptions
    : [pagination.pageSize, ...pageSizeOptions]

  return (
    <div className={cn('flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between', className)}>
      <div className="flex flex-wrap items-center gap-3">
        <p className="text-sm text-muted-foreground">
          Showing {from}–{to} of {pagination.total}
        </p>
        {onPageSizeChange ? (
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            Show
            <select
              aria-label="Rows per page"
              data-testid="rows-per-page"
              value={pagination.pageSize}
              onChange={(event) => onPageSizeChange(Number(event.target.value))}
              className="h-9 rounded-lg border border-border bg-white px-2 text-sm"
            >
              {sizes.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </label>
        ) : null}
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={pagination.page <= 1}
          onClick={() => onPageChange(pagination.page - 1)}
          aria-label="Previous page"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="min-w-[80px] text-center text-sm tabular-nums">
          Page {pagination.page} of {totalPages}
        </span>
        <Button
          variant="outline"
          size="sm"
          disabled={pagination.page >= totalPages}
          onClick={() => onPageChange(pagination.page + 1)}
          aria-label="Next page"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
