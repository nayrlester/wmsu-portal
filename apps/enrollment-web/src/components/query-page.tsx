import { useCallback } from 'react'
import type { UseQueryResult } from '@tanstack/react-query'
import { EmptyState, LoadingState, PageHeader, Pagination, SearchInput } from '@wmsu/ui'
import { listTotalLabel, useLazyPageTrigger, useListControls } from '@/lib/list-query'

export { useListControls }

type Props<T> = {
  title: string
  description?: string
  query: UseQueryResult<T>
  search?: string
  onSearchChange?: (value: string) => void
  searchPlaceholder?: string
  page?: number
  lastPage?: number
  pageSize?: number
  pageSizeOptions?: number[]
  onPageSizeChange?: (size: number) => void
  totalLabel?: string
  onPageChange?: (page: number) => void
  lazyLoad?: boolean
  actions?: React.ReactNode
  children: (data: T) => React.ReactNode
  emptyTitle?: string
  emptyDescription?: string
  isEmpty?: (data: T) => boolean
}

export function QueryPage<T>({
  title,
  description,
  query,
  search,
  onSearchChange,
  searchPlaceholder = 'Search…',
  page,
  lastPage,
  pageSize,
  pageSizeOptions,
  onPageSizeChange,
  totalLabel,
  onPageChange,
  lazyLoad = false,
  actions,
  children,
  emptyTitle = 'No records',
  emptyDescription = 'Nothing matched the current filters.',
  isEmpty,
}: Props<T>) {
  const hasData = query.isSuccess || (query.isFetching && query.data !== undefined)
  const showEmpty = query.isSuccess && !!isEmpty?.(query.data as T) && !query.isFetching
  const showContent = hasData && query.data !== undefined && !isEmpty?.(query.data as T)
  const pageCount = lastPage ?? 1
  const currentPage = page ?? 1
  const canLazyNext = lazyLoad && !!onPageChange && currentPage < pageCount && !query.isFetching

  const loadNext = useCallback(() => {
    if (!canLazyNext || !onPageChange) return
    onPageChange(currentPage + 1)
  }, [canLazyNext, onPageChange, currentPage])

  const setSentinel = useLazyPageTrigger(canLazyNext, loadNext, [currentPage, pageCount])

  const resolvedTotal =
    totalLabel ??
    (page
      ? listTotalLabel(
          (query.data as { meta?: Parameters<typeof listTotalLabel>[0] } | undefined)?.meta,
          page
        )
      : undefined)

  return (
    <div className="space-y-4">
      <PageHeader title={title} description={description} actions={actions} />
      {onSearchChange ? (
        <SearchInput
          value={search ?? ''}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={searchPlaceholder}
          aria-label={searchPlaceholder}
        />
      ) : null}

      {query.isLoading && !query.data ? <LoadingState label={`Loading ${title}`} /> : null}

      {query.isFetching && query.data ? (
        <p className="text-xs text-[var(--color-muted-foreground)]" aria-live="polite">
          Updating results…
        </p>
      ) : null}

      {showEmpty ? <EmptyState title={emptyTitle} description={emptyDescription} /> : null}

      {showContent ? (
        <div className="relative space-y-3">
          {children(query.data as T)}
          {lazyLoad && canLazyNext ? (
            <div ref={setSentinel} className="flex h-8 items-center justify-center">
              <span className="text-xs text-[var(--color-muted-foreground)]">Loading more…</span>
            </div>
          ) : null}
        </div>
      ) : null}

      {!lazyLoad && page && onPageChange ? (
        <div className="rounded-xl border border-[var(--color-border)] bg-white px-4 py-3 shadow-[var(--shadow-soft)]">
          <Pagination
            page={page}
            pageCount={Math.max(pageCount, 1)}
            onPageChange={onPageChange}
            totalLabel={resolvedTotal}
            pageSize={pageSize}
            pageSizeOptions={pageSizeOptions}
            onPageSizeChange={onPageSizeChange}
          />
        </div>
      ) : null}
    </div>
  )
}
