import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  BookOpen,
  Contact,
  ArrowLeftRight,
  Search as SearchIcon,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { SearchFilterSidebar } from '@/features/search/components/search-filter-sidebar'
import { SavedSearchesPanel } from '@/features/search/components/saved-searches-panel'
import { useSearch } from '@/hooks/use-search'
import { useSearchStore } from '@/stores/search-store'
import { ENTITY_TYPE_LABELS, type SearchEntityType, type SearchPreset } from '@/types/search'
import { RowsPerPageSelect } from '@/components/rows-per-page'

const ENTITY_ICONS: Record<SearchEntityType, typeof BookOpen> = {
  book: BookOpen,
  member: Contact,
  transaction: ArrowLeftRight,
}

export function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const urlQuery = searchParams.get('q') ?? ''
  const urlPreset = searchParams.get('preset') ?? undefined
  const [localQuery, setLocalQuery] = useState(urlQuery)
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(20)

  const {
    selectedTypes,
    preset,
    genre,
    categoryId,
    memberType,
    status,
    setPreset,
    sidebarOpen,
    setSidebarOpen,
  } = useSearchStore()

  useEffect(() => {
    setLocalQuery(urlQuery)
    if (urlPreset) setPreset(urlPreset as typeof preset)
    setPage(1)
  }, [urlQuery, urlPreset, setPreset])

  const searchParams_api = useMemo(
    () => ({
      q: urlQuery || undefined,
      types: selectedTypes.length ? selectedTypes : undefined,
      preset: preset ?? (urlPreset as SearchPreset | undefined) ?? undefined,
      genre: genre ?? undefined,
      categoryId: categoryId ?? undefined,
      memberType: memberType ?? undefined,
      status: status ?? undefined,
      page,
      perPage,
    }),
    [urlQuery, selectedTypes, preset, urlPreset, genre, categoryId, memberType, status, page, perPage]
  )

  const hasSearchIntent =
    Boolean(urlQuery) ||
    Boolean(preset || urlPreset) ||
    selectedTypes.length > 0 ||
    Boolean(genre || categoryId || memberType || status)

  const { data, isLoading, isError } = useSearch(searchParams_api, hasSearchIntent)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const params = new URLSearchParams(searchParams)
    if (localQuery.trim()) params.set('q', localQuery.trim())
    else params.delete('q')
    setSearchParams(params)
    setPage(1)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Search</h1>
        <p className="text-sm text-slate-500">Full-text search across books, members, and transactions</p>
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2">
        <div className="relative flex-1">
          <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={localQuery}
            onChange={(e) => setLocalQuery(e.target.value)}
            placeholder="Search by title, author, member name, transaction..."
            className="pl-10"
          />
        </div>
        <Button type="submit">Search</Button>
        <Button type="button" variant="outline" className="lg:hidden" onClick={() => setSidebarOpen(!sidebarOpen)}>
          Filters
        </Button>
      </form>

      <div className="grid gap-6 lg:grid-cols-4">
        <div className={`space-y-4 lg:col-span-1 ${sidebarOpen ? 'block' : 'hidden lg:block'}`}>
          <SearchFilterSidebar facets={data?.facets} />
          <SavedSearchesPanel query={urlQuery} />
        </div>

        <div className="space-y-4 lg:col-span-3">
          {!hasSearchIntent ? (
            <Card>
              <CardContent className="py-12 text-center text-sm text-slate-500">
                Enter a search term or choose a quick filter to get started.
              </CardContent>
            </Card>
          ) : isLoading ? (
            <p className="text-sm text-slate-500">Searching...</p>
          ) : isError ? (
            <p className="text-sm text-red-600">Search failed. Try again.</p>
          ) : data?.results.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-sm text-slate-500">
                No matches in the search index.
                {urlQuery ? ` Try a different term than "${urlQuery}".` : ' Try another filter, or search by title, member, or transaction.'}
              </CardContent>
            </Card>
          ) : (
            <>
              <p className="text-sm text-slate-500">
                {data?.meta.total ?? 0} result{(data?.meta.total ?? 0) === 1 ? '' : 's'}
                {urlQuery ? ` for "${urlQuery}"` : ''}
              </p>

              <div className="divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white">
                {data?.results.map((item) => {
                  const Icon = ENTITY_ICONS[item.entityType]
                  return (
                    <Link
                      key={item.id}
                      to={item.url}
                      className="flex items-start gap-4 p-4 transition-colors hover:bg-slate-50"
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100">
                        <Icon className="h-5 w-5 text-slate-600" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-medium text-slate-900">{item.label}</p>
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                            {ENTITY_TYPE_LABELS[item.entityType]}
                          </span>
                        </div>
                        {item.subtitle && (
                          <p className="mt-0.5 truncate text-sm text-slate-500">{item.subtitle}</p>
                        )}
                        {item.entityType === 'book' && (
                          <p className="mt-1 text-xs text-slate-400">
                            {Number(item.metadata.availableCopies ?? 0) > 0
                              ? `${item.metadata.availableCopies} available`
                              : 'No copies available'}
                            {item.metadata.borrowCount
                              ? ` · ${item.metadata.borrowCount} loans`
                              : ''}
                          </p>
                        )}
                      </div>
                    </Link>
                  )
                })}
              </div>

              {data?.meta ? (
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex flex-wrap items-center gap-3">
                    <p className="text-sm text-slate-500">
                      Page {data.meta.page} of {data.meta.totalPages}
                    </p>
                    <RowsPerPageSelect
                      value={perPage}
                      onChange={(size) => {
                        setPerPage(size)
                        setPage(1)
                      }}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page <= 1}
                      onClick={() => setPage(page - 1)}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page >= data.meta.totalPages}
                      onClick={() => setPage(page + 1)}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ) : null}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
