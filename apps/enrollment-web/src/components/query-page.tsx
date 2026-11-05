import { useState } from 'react'
import type { UseQueryResult } from '@tanstack/react-query'
import {
  EmptyState,
  LoadingState,
  PageHeader,
  Pagination,
  SearchInput,
} from '@wmsu/ui'

type Props<T> = {
  title: string
  description?: string
  query: UseQueryResult<T>
  search?: string
  onSearchChange?: (value: string) => void
  searchPlaceholder?: string
  page?: number
  lastPage?: number
  onPageChange?: (page: number) => void
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
  onPageChange,
  actions,
  children,
  emptyTitle = 'No records',
  emptyDescription = 'Nothing matched the current filters.',
  isEmpty,
}: Props<T>) {
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

      {query.isLoading ? <LoadingState label={`Loading ${title}`} /> : null}

      {query.isSuccess && isEmpty?.(query.data) ? (
        <EmptyState title={emptyTitle} description={emptyDescription} />
      ) : null}

      {query.isSuccess && !isEmpty?.(query.data) ? children(query.data) : null}

      {page && lastPage && onPageChange && lastPage > 1 ? (
        <Pagination page={page} pageCount={lastPage} onPageChange={onPageChange} />
      ) : null}
    </div>
  )
}

export function useListControls(initialSearch = '') {
  const [search, setSearch] = useState(initialSearch)
  const [page, setPage] = useState(1)
  return {
    search,
    setSearch: (value: string) => {
      setPage(1)
      setSearch(value)
    },
    page,
    setPage,
  }
}
