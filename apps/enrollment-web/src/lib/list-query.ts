import { useEffect, useMemo, useState } from 'react'
import {
  keepPreviousData,
  useInfiniteQuery,
  useQuery,
  type InfiniteData,
  type QueryKey,
  type UseInfiniteQueryResult,
  type UseQueryOptions,
  type UseQueryResult,
} from '@tanstack/react-query'
import type { PaginatedResult } from '@/lib/usis-api'

export const LIST_STALE_MS = 60_000
export const LIST_GC_MS = 10 * 60_000
export const DEFAULT_PAGE_SIZE = 20

export function useDebouncedValue<T>(value: T, delayMs = 300): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delayMs)
    return () => window.clearTimeout(timer)
  }, [value, delayMs])
  return debounced
}

export function useListControls(initialSearch = '', pageSize = DEFAULT_PAGE_SIZE) {
  const [search, setSearch] = useState(initialSearch)
  const [page, setPage] = useState(1)
  const debouncedSearch = useDebouncedValue(search, 300)
  return {
    search,
    debouncedSearch,
    setSearch: (value: string) => {
      setPage(1)
      setSearch(value)
    },
    page,
    setPage,
    pageSize,
  }
}

type PaginatedQueryOptions<T> = Omit<
  UseQueryOptions<PaginatedResult<T>, Error, PaginatedResult<T>, QueryKey>,
  'queryKey' | 'queryFn'
> & {
  queryKey: QueryKey
  queryFn: () => Promise<PaginatedResult<T>>
}

export function usePaginatedQuery<T>(
  options: PaginatedQueryOptions<T>
): UseQueryResult<PaginatedResult<T>, Error> {
  return useQuery({
    staleTime: LIST_STALE_MS,
    gcTime: LIST_GC_MS,
    placeholderData: keepPreviousData,
    ...options,
  })
}

export function listTotalLabel(meta?: PaginatedResult<unknown>['meta'], page?: number) {
  if (!meta) return undefined
  const total = meta.total
  const perPage = meta.perPage
  const current = meta.currentPage ?? page ?? 1
  const last = meta.lastPage ?? 1
  if (typeof total === 'number' && typeof perPage === 'number') {
    const from = total === 0 ? 0 : (current - 1) * perPage + 1
    const to = Math.min(current * perPage, total)
    return `Showing ${from}–${to} of ${total}`
  }
  return `Page ${current} of ${last}`
}

export function useLazyPageTrigger(enabled: boolean, onNext: () => void, deps: unknown[] = []) {
  const [node, setNode] = useState<HTMLElement | null>(null)

  useEffect(() => {
    if (!enabled || !node) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) onNext()
      },
      { rootMargin: '240px 0px' }
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [enabled, node, onNext, deps])

  return setNode
}

export function emptyPaginated<T>(): PaginatedResult<T> {
  return {
    data: [],
    meta: { total: 0, perPage: DEFAULT_PAGE_SIZE, currentPage: 1, lastPage: 1 },
  }
}

type InfiniteListOptions<T> = {
  queryKey: QueryKey
  queryFn: (page: number) => Promise<PaginatedResult<T>>
  enabled?: boolean
}

export function useInfiniteListQuery<T>(options: InfiniteListOptions<T>): UseInfiniteQueryResult<
  InfiniteData<PaginatedResult<T>>,
  Error
> & {
  flatRows: T[]
  loadMoreRef: (node: HTMLElement | null) => void
} {
  const query = useInfiniteQuery({
    queryKey: options.queryKey,
    enabled: options.enabled,
    staleTime: LIST_STALE_MS,
    gcTime: LIST_GC_MS,
    initialPageParam: 1,
    queryFn: ({ pageParam }) => options.queryFn(pageParam as number),
    getNextPageParam: (last) => {
      const current = last.meta.currentPage ?? 1
      const lastPage = last.meta.lastPage ?? 1
      return current < lastPage ? current + 1 : undefined
    },
  })

  const flatRows = useMemo(() => query.data?.pages.flatMap((page) => page.data) ?? [], [query.data])

  const loadMoreRef = useLazyPageTrigger(
    Boolean(query.hasNextPage) && !query.isFetchingNextPage,
    () => {
      void query.fetchNextPage()
    },
    [query.hasNextPage, query.isFetchingNextPage, flatRows.length]
  )

  return { ...query, flatRows, loadMoreRef }
}
