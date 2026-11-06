import { useEffect, useState } from 'react'
import {
  keepPreviousData,
  useQuery,
  type QueryKey,
  type UseQueryOptions,
  type UseQueryResult,
} from '@tanstack/react-query'

export const LIST_STALE_MS = 60_000
export const LIST_GC_MS = 10 * 60_000
export const DEFAULT_PAGE_SIZE = 20

export type ListMeta = {
  total?: number
  perPage?: number
  currentPage?: number
  lastPage?: number
}

export type PaginatedResult<T> = {
  data: T[]
  meta: ListMeta
}

export function useDebouncedValue<T>(value: T, delayMs = 300): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delayMs)
    return () => window.clearTimeout(timer)
  }, [value, delayMs])
  return debounced
}

export function useListControls(initialSearch = '', initialPageSize = DEFAULT_PAGE_SIZE) {
  const [search, setSearch] = useState(initialSearch)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSizeState] = useState(initialPageSize)
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
    setPageSize: (size: number) => {
      setPage(1)
      setPageSizeState(size)
    },
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

export function listTotalLabel(meta?: ListMeta, page?: number) {
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
