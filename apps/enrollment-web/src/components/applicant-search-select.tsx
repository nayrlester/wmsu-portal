import { useEffect, useId, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { cn } from '@/lib/utils'
import { fetchApplicants } from '@/lib/usis-api'
import { useDebouncedValue } from '@/lib/list-query'

type ApplicantOption = {
  id: string
  firstName: string
  lastName: string
  status: string
  email?: string
  applicationNumber?: string
}

function formatApplicantLabel(applicant: ApplicantOption) {
  const number = applicant.applicationNumber ? `${applicant.applicationNumber} — ` : ''
  return `${number}${applicant.lastName}, ${applicant.firstName} (${applicant.status})`
}

type Props = {
  id?: string
  value: string
  onChange: (applicantId: string) => void
  placeholder?: string
  disabled?: boolean
  className?: string
}

export function ApplicantSearchSelect({
  id,
  value,
  onChange,
  placeholder = 'Search by applicant name or number…',
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
    queryKey: ['applicant-search-select', debounced],
    queryFn: () => fetchApplicants({ search: debounced.trim(), limit: 20 }),
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

  const options = (searchQuery.data?.data ?? []) as ApplicantOption[]
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
        onChange={(event) => {
          const next = event.target.value
          setText(next)
          setOpen(true)
          setSelectedLabel(null)
          if (!next.trim()) onChange('')
        }}
        className={cn(
          'flex h-10 w-full rounded-xl border border-[var(--color-border)] bg-white px-3 py-2 text-sm text-[var(--color-ink)] shadow-sm',
          'placeholder:text-[var(--color-muted-foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]/35',
          'disabled:cursor-not-allowed disabled:opacity-50'
        )}
      />
      {showList ? (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded-xl border border-[var(--color-border)] bg-white py-1 shadow-lg"
        >
          {searchQuery.isFetching ? (
            <li className="px-3 py-2 text-sm text-[var(--color-muted-foreground)]">Searching…</li>
          ) : null}
          {!searchQuery.isFetching && options.length === 0 ? (
            <li className="px-3 py-2 text-sm text-[var(--color-muted-foreground)]">
              No applicants found
            </li>
          ) : null}
          {options.map((applicant) => (
            <li key={applicant.id}>
              <button
                type="button"
                role="option"
                aria-selected={value === applicant.id}
                className={cn(
                  'w-full px-3 py-2 text-left text-sm hover:bg-[var(--color-muted)]',
                  value === applicant.id && 'bg-[var(--color-muted)] font-medium'
                )}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                  const label = formatApplicantLabel(applicant)
                  setSelectedLabel(label)
                  setText(label)
                  onChange(applicant.id)
                  setOpen(false)
                }}
              >
                {formatApplicantLabel(applicant)}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
