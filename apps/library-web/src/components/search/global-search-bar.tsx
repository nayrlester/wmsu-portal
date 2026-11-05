import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search } from 'lucide-react'
import { useRecentSearches } from '@/hooks/use-search'

export function GlobalSearchBar() {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [focused, setFocused] = useState(false)
  const { data: recent } = useRecentSearches()

  function submit(value?: string) {
    const q = (value ?? query).trim()
    const params = new URLSearchParams()
    if (q) params.set('q', q)
    navigate(`/search?${params.toString()}`)
    setFocused(false)
  }

  return (
    <div className="relative w-full">
      <Search className="pointer-events-none absolute left-5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9aa0c3]" />
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setTimeout(() => setFocused(false), 150)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            submit()
          }
        }}
        placeholder="Search books, members, transactions..."
        className="h-12 w-full rounded-full border-0 bg-white px-12 text-sm text-[var(--color-ink)] shadow-[var(--shadow-soft)] outline-none ring-[var(--color-primary)]/25 placeholder:text-[#9aa0c3] focus:ring-2"
      />

      {focused && recent && recent.length > 0 && (
        <div className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-2xl bg-white shadow-[var(--shadow-soft)] ring-1 ring-[var(--color-border)]">
          <p className="px-4 py-2 text-xs font-semibold uppercase tracking-wide text-[#9aa0c3]">
            Recent
          </p>
          {recent.slice(0, 5).map((item) => (
            <button
              key={item.id}
              type="button"
              className="block w-full px-4 py-2.5 text-left text-sm text-[var(--color-ink)] hover:bg-[var(--color-primary-soft)]"
              onMouseDown={() => submit(item.query || item.filters.preset || '')}
            >
              {item.query || item.filters.preset || 'Filtered search'}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
