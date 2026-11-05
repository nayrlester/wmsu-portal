import { useMemo } from 'react'
import { Archive, Filter, LayoutGrid, List, PanelRight, Search, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DOCUMENT_STATUS_OPTIONS,
  DOCUMENT_LIFECYCLE_OPTIONS,
  DOCUMENT_CONFIDENTIALITY_OPTIONS,
  DOCUMENT_NAP_OPTIONS,
} from '@/features/documents/types/document.types'
import type { DocumentsViewMode } from '@/features/documents/store/documents-ui.store'
import { cn } from '@/lib/utils'

interface DocumentsToolbarProps {
  search: string
  status: string
  lifecycleStatus?: string
  confidentiality?: string
  napCategory?: string
  dueForArchive?: boolean
  total: number
  viewMode: DocumentsViewMode
  showDetailsMode?: boolean
  onSearchChange: (value: string) => void
  onStatusChange: (value: string) => void
  onLifecycleChange?: (value: string) => void
  onConfidentialityChange?: (value: string) => void
  onNapCategoryChange?: (value: string) => void
  onDueForArchiveChange?: (value: boolean) => void
  onViewModeChange: (mode: DocumentsViewMode) => void
}

const VIEW_MODES: Array<{ mode: DocumentsViewMode; icon: typeof LayoutGrid; label: string }> = [
  { mode: 'tile', icon: LayoutGrid, label: 'Tile view' },
  { mode: 'list', icon: List, label: 'List view' },
  { mode: 'details', icon: PanelRight, label: 'Details view' },
]

const filterSelectClass =
  'h-9 w-auto min-w-[8.5rem] max-w-[12rem] shrink-0 border-border/80 bg-background text-sm shadow-none'

function optionLabel(
  options: ReadonlyArray<{ value: string; label: string }>,
  value: string
): string {
  return options.find((option) => option.value === value)?.label ?? value
}

export function DocumentsToolbar({
  search,
  status,
  lifecycleStatus = '',
  confidentiality = '',
  napCategory = '',
  dueForArchive = false,
  total,
  viewMode,
  showDetailsMode = true,
  onSearchChange,
  onStatusChange,
  onLifecycleChange,
  onConfidentialityChange,
  onNapCategoryChange,
  onDueForArchiveChange,
  onViewModeChange,
}: DocumentsToolbarProps) {
  const activeFilters = useMemo(() => {
    const chips: Array<{ key: string; label: string; onClear: () => void }> = []
    if (status) {
      chips.push({
        key: 'status',
        label: optionLabel(DOCUMENT_STATUS_OPTIONS, status),
        onClear: () => onStatusChange(''),
      })
    }
    if (lifecycleStatus && onLifecycleChange) {
      chips.push({
        key: 'lifecycle',
        label: optionLabel(DOCUMENT_LIFECYCLE_OPTIONS, lifecycleStatus),
        onClear: () => onLifecycleChange(''),
      })
    }
    if (confidentiality && onConfidentialityChange) {
      chips.push({
        key: 'confidentiality',
        label: optionLabel(DOCUMENT_CONFIDENTIALITY_OPTIONS, confidentiality),
        onClear: () => onConfidentialityChange(''),
      })
    }
    if (napCategory && onNapCategoryChange) {
      chips.push({
        key: 'nap',
        label: optionLabel(DOCUMENT_NAP_OPTIONS, napCategory),
        onClear: () => onNapCategoryChange(''),
      })
    }
    if (dueForArchive && onDueForArchiveChange) {
      chips.push({
        key: 'due',
        label: 'Due for archive',
        onClear: () => onDueForArchiveChange(false),
      })
    }
    return chips
  }, [
    status,
    lifecycleStatus,
    confidentiality,
    napCategory,
    dueForArchive,
    onStatusChange,
    onLifecycleChange,
    onConfidentialityChange,
    onNapCategoryChange,
    onDueForArchiveChange,
  ])

  const clearAllFilters = () => {
    onStatusChange('')
    onLifecycleChange?.('')
    onConfidentialityChange?.('')
    onNapCategoryChange?.('')
    onDueForArchiveChange?.(false)
  }

  return (
    <div className="desk-card space-y-3 p-3 sm:p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative min-w-0 flex-1">
          <Search
            className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            id="documents-keyword-search"
            placeholder="Search title, tracking #, description, or file content…"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            aria-label="Search documents"
            className="h-9 border-border/80 bg-background pl-9 shadow-none"
          />
        </div>

        <div className="flex items-center gap-2 lg:shrink-0">
          <p className="text-sm text-muted-foreground tabular-nums whitespace-nowrap">
            <span className="font-medium text-foreground">{total}</span> document
            {total === 1 ? '' : 's'}
          </p>
          <div
            className="inline-flex items-center rounded-md border border-border/80 bg-muted/40 p-0.5"
            role="group"
            aria-label="Document view mode"
          >
            {VIEW_MODES.filter((item) => showDetailsMode || item.mode !== 'details').map(
              ({ mode, icon: Icon, label }) => (
                <Button
                  key={mode}
                  type="button"
                  size="sm"
                  variant="ghost"
                  className={cn(
                    'h-8 w-8 p-0 rounded-sm',
                    viewMode === mode && 'bg-background text-foreground shadow-sm'
                  )}
                  aria-label={label}
                  aria-pressed={viewMode === mode}
                  onClick={() => onViewModeChange(mode)}
                >
                  <Icon className="h-4 w-4" />
                </Button>
              )
            )}
          </div>
        </div>
      </div>

      <div className="flex items-start gap-2">
        <Filter className="mt-2.5 hidden h-3.5 w-3.5 shrink-0 text-muted-foreground sm:block" aria-hidden />
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-0.5 [scrollbar-width:thin]">
            <Select
              value={status}
              onChange={(e) => onStatusChange(e.target.value)}
              aria-label="Filter by status"
              className={filterSelectClass}
            >
              {DOCUMENT_STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>

            {onLifecycleChange && (
              <Select
                value={lifecycleStatus}
                onChange={(e) => onLifecycleChange(e.target.value)}
                aria-label="Filter by lifecycle"
                className={filterSelectClass}
              >
                {DOCUMENT_LIFECYCLE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            )}

            {onConfidentialityChange && (
              <Select
                value={confidentiality}
                onChange={(e) => onConfidentialityChange(e.target.value)}
                aria-label="Filter by confidentiality"
                className={cn(filterSelectClass, 'min-w-[10rem] max-w-[13rem]')}
              >
                {DOCUMENT_CONFIDENTIALITY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            )}

            {onNapCategoryChange && (
              <Select
                value={napCategory}
                onChange={(e) => onNapCategoryChange(e.target.value)}
                aria-label="Filter by NAP category"
                className={cn(filterSelectClass, 'min-w-[10rem] max-w-[14rem]')}
              >
                {DOCUMENT_NAP_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            )}

            {onDueForArchiveChange && (
              <button
                type="button"
                onClick={() => onDueForArchiveChange(!dueForArchive)}
                aria-pressed={dueForArchive}
                className={cn(
                  'inline-flex h-9 shrink-0 items-center gap-1.5 rounded-md border px-3 text-sm transition-colors',
                  dueForArchive
                    ? 'border-primary/40 bg-primary/10 text-primary'
                    : 'border-border/80 bg-background text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                )}
              >
                <Archive className="h-3.5 w-3.5" aria-hidden />
                Due for archive
              </button>
            )}
          </div>

          {activeFilters.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              {activeFilters.map((chip) => (
                <Badge
                  key={chip.key}
                  variant="secondary"
                  className="gap-1 rounded-full py-0.5 pr-1 pl-2.5 font-normal"
                >
                  {chip.label}
                  <button
                    type="button"
                    className="rounded-full p-0.5 text-muted-foreground hover:bg-background/80 hover:text-foreground"
                    aria-label={`Clear ${chip.label} filter`}
                    onClick={chip.onClear}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs text-muted-foreground"
                onClick={clearAllFilters}
              >
                Clear all
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
