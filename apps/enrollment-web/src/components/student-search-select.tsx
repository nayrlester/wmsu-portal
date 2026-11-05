import { useEffect, useId, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { cn } from '@/lib/utils'
import { fetchStudents } from '@/lib/usis-api'
import { useDebouncedValue } from '@/lib/list-query'

export type StudentSearchOption = {
  id: string
  studentNumber: string
  firstName: string
  lastName: string
}

function formatStudentLabel(s: StudentSearchOption) {
  return `${s.studentNumber} — ${s.lastName}, ${s.firstName}`
}

type Props = {
  id?: string
  value: string
  onChange: (studentId: string) => void
  placeholder?: string
  disabled?: boolean
  className?: string
}

export function StudentSearchSelect({
  id,
  value,
  onChange,
  placeholder = 'Search by name or student number…',
  disabled,
  className,
}: Props) {
  const listId = useId()
  const rootRef = useRef<HTMLDivElement>(null)
  const [text, setText] = useState('')
  const [open, setOpen] = useState(false)
  const [selectedLabel, setSelectedLabel] = useState<string | null>(null)
  const debounced = useDebouncedValue(text, 300)

  const searchQuery = useQuery({
    queryKey: ['student-search-select', debounced],
    queryFn: () => fetchStudents({ search: debounced.trim(), limit: 20 }),
    enabled: open && debounced.trim().length >= 1,
  })

  useEffect(() => {
    if (!value) {
      setSelectedLabel(null)
      if (!open) setText('')
    }
  }, [value, open])

  useEffect(() => {
    const onDoc = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  const options = searchQuery.data?.data ?? []
  const showList = open && debounced.trim().length >= 1

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
          {searchQuery.isFetching ? (
            <li className="px-4 py-2 text-sm text-[var(--color-muted-foreground)]">Searching…</li>
          ) : null}
          {!searchQuery.isFetching && options.length === 0 ? (
            <li className="px-4 py-2 text-sm text-[var(--color-muted-foreground)]">
              No students found
            </li>
          ) : null}
          {options.map((s) => (
            <li key={s.id}>
              <button
                type="button"
                role="option"
                aria-selected={value === s.id}
                className={cn(
                  'w-full px-4 py-2 text-left text-sm hover:bg-[var(--color-primary-soft)]',
                  value === s.id && 'bg-[var(--color-primary-soft)] font-medium'
                )}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  const label = formatStudentLabel(s)
                  setSelectedLabel(label)
                  setText(label)
                  onChange(s.id)
                  setOpen(false)
                }}
              >
                {formatStudentLabel(s)}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
