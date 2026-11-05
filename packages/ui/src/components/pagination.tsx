import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '../lib/utils'
import { Button } from './button'

export type PaginationProps = {
  page: number
  pageCount: number
  onPageChange: (page: number) => void
  className?: string
  totalLabel?: string
}

export function Pagination({ page, pageCount, onPageChange, className, totalLabel }: PaginationProps) {
  const safeCount = Math.max(pageCount, 1)
  const canPrev = page > 1
  const canNext = page < safeCount

  return (
    <div className={cn('flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between', className)}>
      <p className="text-sm text-[var(--color-muted-foreground)]">
        {totalLabel ?? `Page ${page} of ${safeCount}`}
      </p>
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
