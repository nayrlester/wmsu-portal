import { useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useMutation, useQuery } from '@tanstack/react-query'
import {
  File,
  FileText,
  GitBranch,
  ImagePlus,
  Loader2,
  Search,
  User,
} from 'lucide-react'
import { PageContainer } from '@/components/desk-app/layout/page-container'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { searchApi } from '@/api'
import { cn, formatBytes } from '@/lib/utils'
import type { SearchFilterTab } from '@/features/search/types/search.types'
import { HighlightText } from '@/features/search/components/highlight-text'
import {
  filterSearchResults,
  getHitLabel,
  getHitPath,
  getHitSnippet,
  getHitSubtitle,
  normalizeSearchFilterTab,
  SEARCH_FILTER_TABS,
  tabToApiTypes,
  type FlatSearchHit,
} from '@/features/search/utils/search.helpers'

function ResultIcon({ hit }: { hit: FlatSearchHit }) {
  const className = 'h-4 w-4 shrink-0 text-primary'
  switch (hit.type) {
    case 'document':
      return <FileText className={className} />
    case 'file':
      return <File className={className} />
    case 'user':
      return <User className={className} />
    case 'workflow':
      return <GitBranch className={className} />
  }
}

export function SearchResultsPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const initialQuery = searchParams.get('q') ?? ''
  const initialTab = normalizeSearchFilterTab(searchParams.get('tab'))

  const [q, setQ] = useState(initialQuery)
  const [tab, setTab] = useState<SearchFilterTab>(initialTab)
  const [submitted, setSubmitted] = useState(initialQuery)
  const [extractedText, setExtractedText] = useState<string | null>(null)

  const trimmed = submitted.trim()
  const canSearch = trimmed.length >= 2

  const { data, isFetching } = useQuery({
    queryKey: ['search-results', trimmed, tab],
    queryFn: () =>
      searchApi.search({
        q: trimmed,
        limit: 50,
        types: tabToApiTypes(tab),
      }),
    enabled: canSearch,
  })

  const imageSearch = useMutation({
    mutationFn: (file: File) => searchApi.searchByImage(file, 50),
    onSuccess: (result) => {
      setExtractedText(result.extractedText || null)
      setSubmitted(result.query)
      setQ(result.query)
      setSearchParams({ q: result.query, tab })
    },
  })

  const hits = useMemo(() => (data ? filterSearchResults(data, tab) : []), [data, tab])

  const submitSearch = () => {
    const value = q.trim()
    setSubmitted(value)
    setExtractedText(null)
    setSearchParams(value ? { q: value, tab } : { tab })
  }

  return (
    <PageContainer
      title="Search"
      description="Search keywords across document titles, written content, uploaded files, and team members."
      breadcrumb="Home / Search"
    >
      <div className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(event) => setQ(event.target.value)}
              onKeyDown={(event) => event.key === 'Enter' && submitSearch()}
              placeholder="Search keywords across titles, tracking numbers, content, and people…"
              className="pl-9"
            />
          </div>
          <div className="flex gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0]
                if (file) imageSearch.mutate(file)
                event.target.value = ''
              }}
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={imageSearch.isPending}
            >
              {imageSearch.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ImagePlus className="h-4 w-4" />
              )}
              Search by image
            </Button>
            <Button type="button" onClick={submitSearch}>
              Search
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {SEARCH_FILTER_TABS.map((filter) => (
            <button
              key={filter.id}
              type="button"
              onClick={() => {
                setTab(filter.id)
                if (trimmed) setSearchParams({ q: trimmed, tab: filter.id })
              }}
              className={cn(
                'rounded-full px-3 py-1 text-xs font-medium transition-colors',
                tab === filter.id
                  ? 'bg-primary text-primary-foreground'
                  : 'border border-border text-muted-foreground hover:bg-muted/50'
              )}
            >
              {filter.label}
              {data && filter.id !== 'all' && (
                <span className="ml-1 opacity-70">
                  (
                  {filter.id === 'keywords'
                    ? data.meta.documents + data.meta.files
                    : data.meta[filter.id === 'document' ? 'documents' : 'users']}
                  )
                </span>
              )}
            </button>
          ))}
        </div>

        {extractedText && (
          <div className="rounded-lg border border-border/80 bg-muted/30 px-4 py-3 text-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Text extracted from image
            </p>
            <p className="mt-1 text-foreground">{extractedText}</p>
          </div>
        )}

        {!canSearch ? (
          <div className="rounded-lg border border-dashed border-border px-6 py-12 text-center text-sm text-muted-foreground">
            Enter at least 2 characters, or upload an image to search by its contents.
          </div>
        ) : isFetching || imageSearch.isPending ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Searching for &quot;{trimmed}&quot;…
          </div>
        ) : hits.length === 0 ? (
          <div className="rounded-lg border border-border px-6 py-12 text-center text-sm text-muted-foreground">
            No results for &quot;{trimmed}&quot;. Try different keywords or upload a clearer image.
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-border">
            <div className="border-b border-border bg-muted/30 px-4 py-2 text-xs text-muted-foreground">
              {data?.meta.total ?? hits.length} result{(data?.meta.total ?? hits.length) === 1 ? '' : 's'}
            </div>
            <ul className="divide-y divide-border">
              {hits.map((hit) => (
                <li key={`${hit.type}-${hit.item.id}`}>
                  <button
                    type="button"
                    className="flex w-full items-start gap-3 px-4 py-4 text-left hover:bg-muted/30"
                    onClick={() => navigate(getHitPath(hit, trimmed))}
                  >
                    <ResultIcon hit={hit} />
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">{getHitLabel(hit)}</p>
                      {getHitSubtitle(hit) && (
                        <p className="text-sm text-muted-foreground">{getHitSubtitle(hit)}</p>
                      )}
                      {getHitSnippet(hit) && (
                        <p className="mt-1 text-sm text-muted-foreground">
                          <HighlightText text={getHitSnippet(hit)!} query={trimmed} />
                        </p>
                      )}
                      {hit.type === 'file' && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          {hit.item.mimeType} · {formatBytes(hit.item.fileSize)} ·{' '}
                          {hit.item.matchField === 'content' ? 'matched in file content' : 'matched filename'}
                        </p>
                      )}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        <p className="text-xs text-muted-foreground">
          Tip: Press <kbd className="rounded border border-border px-1">⌘K</kbd> from anywhere to open quick
          search.{' '}
          <Link to="/app/documents" className="text-primary hover:underline">
            Browse all documents
          </Link>
        </p>
      </div>
    </PageContainer>
  )
}
