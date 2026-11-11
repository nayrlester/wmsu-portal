import { useEffect, useId, useRef, useState } from 'react'
import { cn } from '../lib/utils'

export type PersonnelSearchOption = {
  id: string
  fullName: string
  email: string
  roles?: string[]
}

function formatPersonnelLabel(row: PersonnelSearchOption) {
  const roleHint = row.roles?.length ? ` · ${row.roles.join(', ')}` : ''
  return `${row.fullName} · ${row.email}${roleHint}`
}

export type PersonnelSearchSelectProps = {
  id?: string
  value: string
  onChange: (userId: string) => void
  onSearch: (query: string) => Promise<PersonnelSearchOption[]>
  placeholder?: string
  disabled?: boolean
  className?: string
  minQueryLength?: number
  valueLabel?: string | null
}

export function PersonnelSearchSelect({
  id,
  value,
  onChange,
  onSearch,
  placeholder = 'Search faculty or staff by name or email…',
  disabled,
  className,
  minQueryLength = 1,
  valueLabel,
}: PersonnelSearchSelectProps) {
  const listId = useId()
  const rootRef = useRef<HTMLDivElement>(null)
  const [text, setText] = useState('')
  const [open, setOpen] = useState(false)
  const [selectedLabel, setSelectedLabel] = useState<string | null>(null)
  const [debounced, setDebounced] = useState('')
  const [options, setOptions] = useState<PersonnelSearchOption[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(text.trim()), 300)
    return () => clearTimeout(timer)
  }, [text])

  useEffect(() => {
    if (!open || debounced.length < minQueryLength) {
      setOptions([])
      return
    }
    let cancelled = false
    setLoading(true)
    void onSearch(debounced)
      .then((rows) => {
        if (!cancelled) setOptions(rows)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [debounced, minQueryLength, onSearch, open])

  useEffect(() => {
    if (!value) {
      setSelectedLabel(null)
      if (!open) setText('')
      return
    }
    if (valueLabel) setSelectedLabel(valueLabel)
  }, [value, valueLabel, open])

  useEffect(() => {
    const onDoc = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  const showList = open && debounced.length >= minQueryLength

  return (
    <div ref={rootRef} className={cn('relative', className)}>
      <input
        id={id}
        type="search"
        role="combobox"
        aria-expanded={showList}
        aria-controls={listId}
        autoComplete="off"
        disabled={disabled}
        value={open ? text : (selectedLabel ?? text)}
        placeholder={placeholder}
        onFocus={() => {
          setOpen(true)
          if (selectedLabel) setText(selectedLabel)
        }}
        onChange={(e) => {
          const next = e.target.value
          setText(next)
          setOpen(true)
          setSelectedLabel(null)
          if (!next.trim()) onChange('')
        }}
        className={cn(
          'flex h-11 w-full rounded-full border border-transparent bg-[var(--color-primary-soft)] px-4 py-2 text-sm text-[var(--color-ink)]',
          'placeholder:text-[#9aa0c3] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/35',
          'disabled:cursor-not-allowed disabled:opacity-50'
        )}
      />
      {showList ? (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] py-1 shadow-lg"
        >
          {loading ? (
            <li className="px-4 py-2 text-sm text-[var(--color-muted-foreground)]">Searching…</li>
          ) : null}
          {!loading && options.length === 0 ? (
            <li className="px-4 py-2 text-sm text-[var(--color-muted-foreground)]">No personnel found</li>
          ) : null}
          {options.map((row) => (
            <li key={row.id}>
              <button
                type="button"
                role="option"
                aria-selected={value === row.id}
                className={cn(
                  'w-full px-4 py-2 text-left text-sm hover:bg-[var(--color-primary-soft)]',
                  value === row.id && 'bg-[var(--color-primary-soft)] font-medium'
                )}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  const label = formatPersonnelLabel(row)
                  setSelectedLabel(label)
                  setText(label)
                  onChange(row.id)
                  setOpen(false)
                }}
              >
                {formatPersonnelLabel(row)}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
