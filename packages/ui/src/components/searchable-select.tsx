import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { cn } from '../lib/utils'

export type SearchableSelectOption = {
  value: string
  label: string
}

type SearchableSelectProps = {
  id?: string
  value: string
  onChange: (value: string) => void
  options: SearchableSelectOption[]
  placeholder?: string
  disabled?: boolean
  className?: string
  emptyText?: string
  invalid?: boolean
}

export function SearchableSelect({
  id,
  value,
  onChange,
  options,
  placeholder = 'Type a name to search…',
  disabled,
  className,
  emptyText = 'No matches',
  invalid,
}: SearchableSelectProps) {
  const listId = useId()
  const rootRef = useRef<HTMLDivElement>(null)
  const [text, setText] = useState('')
  const [open, setOpen] = useState(false)

  const selected = options.find((option) => option.value === value) ?? null

  useEffect(() => {
    if (!value) setText('')
  }, [value])

  useEffect(() => {
    const onDoc = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  const filtered = useMemo(() => {
    const query = text.trim().toLowerCase()
    if (!query) return options.slice(0, 30)
    return options
      .filter((option) => option.label.toLowerCase().includes(query))
      .slice(0, 30)
  }, [options, text])

  const shown = open ? text : selected?.label || text

  return (
    <div ref={rootRef} className={cn('relative', className)}>
      <input
        id={id}
        type="search"
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-invalid={invalid || undefined}
        autoComplete="off"
        disabled={disabled}
        value={shown}
        placeholder={placeholder}
        onFocus={() => {
          setOpen(true)
          setText(selected?.label ?? text)
        }}
        onChange={(event) => {
          const next = event.target.value
          setText(next)
          setOpen(true)
          if (!next.trim()) onChange('')
          else if (selected && next !== selected.label) onChange('')
        }}
        className={cn(
          'flex h-10 w-full rounded-xl border bg-white px-3 py-2 text-sm text-[var(--color-ink)] shadow-sm placeholder:text-[var(--color-muted-foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]/35 disabled:cursor-not-allowed disabled:opacity-50',
          invalid ? 'border-[var(--color-destructive)]' : 'border-[var(--color-border)]'
        )}
      />
      {open ? (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-30 mt-1 max-h-60 w-full overflow-auto rounded-xl border border-[var(--color-border)] bg-white py-1 shadow-lg"
        >
          {filtered.length === 0 ? (
            <li className="px-3 py-2 text-sm text-[var(--color-muted-foreground)]">{emptyText}</li>
          ) : (
            filtered.map((option) => (
              <li key={option.value}>
                <button
                  type="button"
                  role="option"
                  aria-selected={value === option.value}
                  className={cn(
                    'w-full px-3 py-2 text-left text-sm hover:bg-[var(--color-muted)]',
                    value === option.value && 'bg-[var(--color-muted)] font-medium'
                  )}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => {
                    setText(option.label)
                    onChange(option.value)
                    setOpen(false)
                  }}
                >
                  {option.label}
                </button>
              </li>
            ))
          )}
        </ul>
      ) : null}
    </div>
  )
}
