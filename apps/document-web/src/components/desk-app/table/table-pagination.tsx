import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { PaginationState } from './types'

export interface TablePaginationProps {
  pagination: PaginationState
  onPageChange: (page: number) => void
  className?: string
}

export function TablePagination({ pagination, onPageChange, className }: TablePaginationProps) {
  const totalPages = Math.max(1, Math.ceil(pagination.total / pagination.pageSize))
  const from = pagination.total === 0 ? 0 : (pagination.page - 1) * pagination.pageSize + 1
  const to = Math.min(pagination.page * pagination.pageSize, pagination.total)

  return (
    <div className={cn('flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between', className)}>
      <p className="text-sm text-muted-foreground">
        Showing {from}–{to} of {pagination.total}
      </p>
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
