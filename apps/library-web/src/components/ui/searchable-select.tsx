import { useEffect, useId, useMemo, useRef, useState, type MouseEvent as ReactMouseEvent } from 'react'
import { ChevronDown, Search, X } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface SearchableSelectOption {
  value: string
  label: string
  description?: string
}

interface SearchableSelectProps {
  options: SearchableSelectOption[]
  value: string
  onChange: (value: string) => void
  onSearchChange?: (search: string) => void
  placeholder?: string
  emptyMessage?: string
  isLoading?: boolean
  disabled?: boolean
  className?: string
}

export function SearchableSelect({
  options,
  value,
  onChange,
  onSearchChange,
  placeholder = 'Search...',
  emptyMessage = 'No results found',
  isLoading = false,
  disabled = false,
  className,
}: SearchableSelectProps) {
  const listId = useId()
  const rootRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')

  const selected = useMemo(
    () => options.find((option) => option.value === value) ?? null,
    [options, value]
  )

  useEffect(() => {
    if (!open) return

    function handlePointerDown(event: globalThis.MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false)
        setQuery('')
        onSearchChange?.('')
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpen(false)
        setQuery('')
        onSearchChange?.('')
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [open, onSearchChange])

  function openDropdown() {
    if (disabled) return
    setOpen(true)
    setQuery('')
    onSearchChange?.('')
    requestAnimationFrame(() => inputRef.current?.focus())
  }

  function handleQueryChange(next: string) {
    setQuery(next)
    onSearchChange?.(next)
    if (!open) setOpen(true)
  }

  function selectOption(option: SearchableSelectOption) {
    onChange(option.value)
    setOpen(false)
    setQuery('')
    onSearchChange?.('')
  }

  function clearSelection(event: ReactMouseEvent) {
    event.stopPropagation()
    onChange('')
    setQuery('')
    onSearchChange?.('')
    setOpen(true)
    requestAnimationFrame(() => inputRef.current?.focus())
  }

  const displayOptions =
    onSearchChange || !query.trim()
      ? options
      : options.filter((option) => {
          const haystack = `${option.label} ${option.description ?? ''}`.toLowerCase()
          return haystack.includes(query.trim().toLowerCase())
        })

  return (
    <div ref={rootRef} className={cn('relative', className)}>
      <button
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => (open ? setOpen(false) : openDropdown())}
        className={cn(
          'flex h-11 w-full items-center gap-2 rounded-full border border-transparent bg-[var(--color-primary-soft)] px-4 text-left text-sm text-[var(--color-ink)]',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/35',
          'disabled:cursor-not-allowed disabled:opacity-50',
          open && 'ring-2 ring-[var(--color-primary)]/35'
        )}
      >
        {open ? (
          <>
            <Search className="h-4 w-4 shrink-0 text-[#9aa0c3]" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => handleQueryChange(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              placeholder={placeholder}
              className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-[#9aa0c3]"
            />
          </>
        ) : (
          <>
            <span
              className={cn(
                'min-w-0 flex-1 truncate',
                selected ? 'text-[var(--color-ink)]' : 'text-[#9aa0c3]'
              )}
            >
              {selected ? selected.label : placeholder}
            </span>
            {selected ? (
              <span
                role="button"
                tabIndex={-1}
                onClick={clearSelection}
                className="rounded-full p-0.5 text-[#9aa0c3] hover:bg-white/70 hover:text-[var(--color-ink)]"
                aria-label="Clear selection"
              >
                <X className="h-3.5 w-3.5" />
              </span>
            ) : (
              <ChevronDown className="h-4 w-4 shrink-0 text-[#9aa0c3]" />
            )}
          </>
        )}
      </button>

      {open && (
        <div
          id={listId}
          role="listbox"
          className="absolute left-0 right-0 z-40 mt-2 max-h-60 overflow-auto rounded-2xl border border-slate-100 bg-white py-1 shadow-[var(--shadow-soft)]"
        >
          {isLoading ? (
            <p className="px-4 py-3 text-sm text-slate-500">Searching...</p>
          ) : displayOptions.length === 0 ? (
            <p className="px-4 py-3 text-sm text-slate-500">{emptyMessage}</p>
          ) : (
            displayOptions.map((option) => {
              const isActive = option.value === value
              return (
                <button
                  key={option.value}
                  type="button"
                  role="option"
                  aria-selected={isActive}
                  onClick={() => selectOption(option)}
                  className={cn(
                    'flex w-full flex-col gap-0.5 px-4 py-2.5 text-left transition-colors hover:bg-[var(--color-primary-soft)]',
                    isActive && 'bg-[var(--color-primary-soft)]'
                  )}
                >
                  <span className="text-sm font-medium text-slate-900">{option.label}</span>
                  {option.description ? (
                    <span className="text-xs text-slate-500">{option.description}</span>
                  ) : null}
                </button>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}
