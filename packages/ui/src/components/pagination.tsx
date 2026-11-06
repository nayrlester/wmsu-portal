import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '../lib/utils'
import { Button } from './button'

export type PaginationProps = {
  page: number
  pageCount: number
  onPageChange: (page: number) => void
  className?: string
  totalLabel?: string
  pageSize?: number
  pageSizeOptions?: number[]
  onPageSizeChange?: (size: number) => void
}

export function Pagination({
  page,
  pageCount,
  onPageChange,
  className,
  totalLabel,
  pageSize,
  pageSizeOptions = [10, 20, 50, 100],
  onPageSizeChange,
}: PaginationProps) {
  const safeCount = Math.max(pageCount, 1)
  const canPrev = page > 1
  const canNext = page < safeCount

  return (
    <div className={cn('flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between', className)}>
      <div className="flex flex-wrap items-center gap-3">
        <p className="text-sm text-[var(--color-muted-foreground)]">
          {totalLabel ?? `Page ${page} of ${safeCount}`}
        </p>
        {onPageSizeChange ? (
          <label className="flex items-center gap-2 text-sm text-[var(--color-muted-foreground)]">
            Show
            <select
              aria-label="Rows per page"
              data-testid="rows-per-page"
              value={pageSize}
              onChange={(event) => onPageSizeChange(Number(event.target.value))}
              className="h-9 rounded-lg border border-[var(--color-border)] bg-white px-2 text-sm text-[var(--color-ink)]"
            >
              {pageSizeOptions.map((size) => (
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
          type="button"
          variant="outline"
          size="sm"
          disabled={!canPrev}
          onClick={() => onPageChange(page - 1)}
          aria-label="Previous page"
        >
          <ChevronLeft className="h-4 w-4" />
          Previous
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={!canNext}
          onClick={() => onPageChange(page + 1)}
          aria-label="Next page"
        >
          Next
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
