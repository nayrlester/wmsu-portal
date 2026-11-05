import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useDebouncedValue } from '@/shared/hooks/use-debounced-value'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery } from '@tanstack/react-query'
import {
  FileText,
  File,
  GitBranch,
  ImagePlus,
  Loader2,
  Search,
  User,
  X,
} from 'lucide-react'
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
  SEARCH_FILTER_TABS,
  tabToApiTypes,
  type FlatSearchHit,
} from '@/features/search/utils/search.helpers'

interface CommandPaletteSearchProps {
  open: boolean
  onClose: () => void
  query?: string
  onQueryChange?: (query: string) => void
}

function HitIcon({ hit }: { hit: FlatSearchHit }) {
  const className = 'mt-0.5 h-4 w-4 shrink-0 text-primary'
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

export function CommandPaletteSearch({
  open,
  onClose,
  query: controlledQuery,
  onQueryChange,
}: CommandPaletteSearchProps) {
  const navigate = useNavigate()
  const inputRef = useRef<HTMLInputElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [internalQ, setInternalQ] = useState('')
  const q = controlledQuery ?? internalQ
  const setQ = onQueryChange ?? setInternalQ
  const [tab, setTab] = useState<SearchFilterTab>('all')
  const [activeIndex, setActiveIndex] = useState(0)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [extractedText, setExtractedText] = useState<string | null>(null)
  const [imageMode, setImageMode] = useState(false)

  const debouncedQ = useDebouncedValue(q, 300)
  const trimmed = debouncedQ.trim()
  const canSearch = trimmed.length >= 2

  const imageSearch = useMutation({
    mutationFn: (file: File) => searchApi.searchByImage(file, 12),
    onSuccess: (result) => {
      setExtractedText(result.extractedText || null)
      setImageMode(true)
      setQ(result.query || '')
    },
  })

  const { data: textData, isFetching, isError, error } = useQuery({
    queryKey: ['universal-search', trimmed, tab],
    queryFn: () =>
      searchApi.search({
        q: trimmed,
        limit: 12,
        types: tabToApiTypes(tab),
      }),
    enabled: open && canSearch && !imageMode,
    retry: 1,
  })

  const data = imageMode && imageSearch.data ? imageSearch.data : textData

  const hits = useMemo(() => {
    if (!data) return []
    return filterSearchResults(data, tab)
  }, [data, tab])

  const selectHit = useCallback(
    (hit: FlatSearchHit) => {
      navigate(getHitPath(hit, trimmed || imageSearch.data?.query))
      onClose()
    },
    [navigate, onClose, trimmed, imageSearch.data?.query]
  )

  const resetState = useCallback(() => {
    setInternalQ('')
    onQueryChange?.('')
    setTab('all')
    setActiveIndex(0)
    setImagePreview(null)
    setExtractedText(null)
    setImageMode(false)
    imageSearch.reset()
  }, [imageSearch, onQueryChange])

  const handleClose = useCallback(() => {
    resetState()
    onClose()
  }, [onClose, resetState])

  useEffect(() => {
    if (!open) return
    const timer = window.setTimeout(() => inputRef.current?.focus(), 50)
    return () => window.clearTimeout(timer)
  }, [open])

  useEffect(() => {
    if (!open) return

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        handleClose()
        return
      }

      if (!hits.length) return

      if (event.key === 'ArrowDown') {
        event.preventDefault()
        setActiveIndex((index) => (index + 1) % hits.length)
      }

      if (event.key === 'ArrowUp') {
        event.preventDefault()
        setActiveIndex((index) => (index - 1 + hits.length) % hits.length)
      }

      if (event.key === 'Enter' && hits[activeIndex]) {
        event.preventDefault()
        selectHit(hits[activeIndex])
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open, hits, activeIndex, selectHit, handleClose])

  useEffect(() => {
    setActiveIndex(0)
  }, [q, tab, data])

  const handleImageUpload = (file: File | undefined) => {
    if (!file) return

    const preview = URL.createObjectURL(file)
    setImagePreview(preview)
    setExtractedText(null)
    setImageMode(true)
    setQ('')
    imageSearch.mutate(file)
  }

  const handleQueryChange = (value: string) => {
    setImageMode(false)
    setExtractedText(null)
    setImagePreview(null)
    imageSearch.reset()
    setQ(value)
  }

  if (!open) return null

  const isLoading = isFetching || imageSearch.isPending
  const showEmpty =
    !isError && (canSearch || (imageMode && imageSearch.isSuccess)) && !isLoading && hits.length === 0
  const errorMessage =
    isError && error instanceof Error ? error.message : isError ? 'Search failed. Please try again.' : null

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center p-4 pt-[12vh]">
      <button
        type="button"
        className="absolute inset-0 bg-foreground/20 backdrop-blur-sm"
        aria-label="Close search"
        onClick={handleClose}
      />

      <div
        id="command-palette-search"
        role="dialog"
        aria-modal="true"
        aria-label="Search"
        className="relative z-10 w-full max-w-2xl overflow-hidden rounded-xl border border-border/80 bg-card shadow-2xl animate-page-in"
      >
        <div className="flex items-center gap-2 border-b border-border/60 px-3">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
          <Input
            ref={inputRef}
            value={q}
            onChange={(event) => handleQueryChange(event.target.value)}
            placeholder="Search documents, keywords, content, and people…"
            className="h-12 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
            aria-label="Search query"
          />
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg"
            className="hidden"
            onChange={(event) => {
              handleImageUpload(event.target.files?.[0])
              event.target.value = ''
            }}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="shrink-0"
            onClick={() => fileInputRef.current?.click()}
            aria-label="Search by image"
            title="Search by image (OCR)"
          >
            {imageSearch.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ImagePlus className="h-4 w-4" />
            )}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="shrink-0"
            onClick={handleClose}
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex gap-1 overflow-x-auto border-b border-border/60 px-3 py-2">
          {SEARCH_FILTER_TABS.map((filter) => (
            <button
              key={filter.id}
              type="button"
              onClick={() => setTab(filter.id)}
              className={cn(
                'rounded-md px-3 py-1 text-xs font-medium transition-colors',
                tab === filter.id
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
              )}
            >
              {filter.label}
            </button>
          ))}
        </div>

        {(imagePreview || extractedText) && (
          <div className="border-b border-border/60 bg-muted/30 px-4 py-3">
            <div className="flex items-start gap-3">
              {imagePreview && (
                <img
                  src={imagePreview}
                  alt="Uploaded search image"
                  className="h-14 w-14 rounded-md border border-border object-cover"
                />
              )}
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Image search
                </p>
                {imageSearch.isPending ? (
                  <p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Extracting text from image…
                  </p>
                ) : extractedText ? (
                  <p className="mt-1 line-clamp-2 text-sm text-foreground">{extractedText}</p>
                ) : (
                  <p className="mt-1 text-sm text-muted-foreground">
                    No readable text found in the image.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="max-h-[min(50vh,420px)] overflow-y-auto">
          {!canSearch && !imageSearch.isPending && !imageMode ? (
            <div className="space-y-3 px-4 py-8 text-center text-sm text-muted-foreground">
              <p>Type at least 2 characters. Use Keywords to search inside document and file content.</p>
              <p>Upload an image to find documents by text inside photos or scans.</p>
              <p className="text-xs">
                <kbd className="rounded border border-border bg-muted px-1.5 py-0.5">↑</kbd>{' '}
                <kbd className="rounded border border-border bg-muted px-1.5 py-0.5">↓</kbd> navigate ·{' '}
                <kbd className="rounded border border-border bg-muted px-1.5 py-0.5">Enter</kbd> open ·{' '}
                <kbd className="rounded border border-border bg-muted px-1.5 py-0.5">Esc</kbd> close
              </p>
            </div>
          ) : isLoading ? (
            <div className="flex items-center gap-2 px-4 py-8 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Searching…
            </div>
          ) : isError ? (
            <div className="px-4 py-8 text-sm">
              <p className="font-medium text-destructive">Search unavailable</p>
              <p className="mt-1 text-muted-foreground">{errorMessage}</p>
            </div>
          ) : showEmpty ? (
            <p className="px-4 py-8 text-sm text-muted-foreground">
              No results for &quot;{trimmed}&quot;
            </p>
          ) : (
            <ul>
              {hits.map((hit, index) => (
                <li key={`${hit.type}-${hit.type === 'file' ? hit.item.id : hit.item.id}`}>
                  <button
                    type="button"
                    className={cn(
                      'flex w-full items-start gap-3 px-4 py-3 text-left transition-colors',
                      index === activeIndex ? 'bg-muted/70' : 'hover:bg-muted/40'
                    )}
                    onMouseEnter={() => setActiveIndex(index)}
                    onClick={() => selectHit(hit)}
                  >
                    <HitIcon hit={hit} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{getHitLabel(hit)}</p>
                      {getHitSubtitle(hit) && (
                        <p className="truncate text-xs text-muted-foreground">{getHitSubtitle(hit)}</p>
                      )}
                      {getHitSnippet(hit) && (
                        <p className="mt-1 line-clamp-2 text-xs text-muted-foreground/90">
                          <HighlightText text={getHitSnippet(hit)!} query={trimmed} />
                        </p>
                      )}
                      {hit.type === 'file' && (
                        <p className="mt-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                          {hit.item.mimeType} · {formatBytes(hit.item.fileSize)}
                          {hit.item.matchField === 'content' ? ' · matched in file content' : ' · matched filename'}
                        </p>
                      )}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {(canSearch || (imageMode && imageSearch.isSuccess)) && hits.length > 0 && (
          <div className="border-t border-border/60 px-4 py-2.5">
            <button
              type="button"
              className="text-xs font-medium text-primary hover:underline"
              onClick={() => {
                navigate(`/app/search?q=${encodeURIComponent(trimmed || imageSearch.data?.query || '')}&tab=${tab}`)
                handleClose()
              }}
            >
              View all results
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
