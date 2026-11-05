import { Filter, X } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { useSearchStore } from '@/stores/search-store'
import type { SearchFacets } from '@/types/search'
import {
  ENTITY_TYPE_LABELS,
  PRESET_DESCRIPTIONS,
  PRESET_LABELS,
  type SearchEntityType,
  type SearchPreset,
} from '@/types/search'

const PRESETS: SearchPreset[] = ['available', 'overdue', 'most_borrowed', 'new_arrivals']

const PRESET_ENTITY_TYPES: Record<SearchPreset, SearchEntityType[]> = {
  available: ['book'],
  most_borrowed: ['book'],
  new_arrivals: ['book'],
  overdue: ['transaction'],
}

interface SearchFilterSidebarProps {
  facets?: SearchFacets
}

export function SearchFilterSidebar({ facets }: SearchFilterSidebarProps) {
  const [searchParams, setSearchParams] = useSearchParams()
  const {
    selectedTypes,
    preset,
    genre,
    categoryId,
    memberType,
    status,
    toggleType,
    setPreset,
    setGenre,
    setCategoryId,
    setMemberType,
    setStatus,
    resetFilters,
  } = useSearchStore()

  function handlePresetClick(next: SearchPreset) {
    const clearing = preset === next
    setPreset(clearing ? null : next)

    const params = new URLSearchParams(searchParams)
    if (clearing) params.delete('preset')
    else params.set('preset', next)
    setSearchParams(params)
  }

  const impliedTypes = preset ? PRESET_ENTITY_TYPES[preset] : []

  return (
    <aside className="space-y-6">
      <div className="flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
          <Filter className="h-4 w-4" />
          Filters
        </h2>
        <Button
          variant="outline"
          size="sm"
          className="h-8 shrink-0 rounded-full border-[var(--color-border)] bg-white px-3 text-xs font-semibold text-[var(--color-ink)] shadow-sm hover:bg-[var(--color-primary-soft)] hover:text-[var(--color-primary)]"
          onClick={() => {
            resetFilters()
            const params = new URLSearchParams(searchParams)
            params.delete('preset')
            setSearchParams(params)
          }}
        >
          <X className="mr-1 h-3.5 w-3.5" />
          Clear
        </Button>
      </div>

      <section>
        <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">Quick filters</h3>
        <div className="space-y-1">
          {PRESETS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => handlePresetClick(p)}
              className={`w-full rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                preset === p
                  ? 'bg-blue-50 font-medium text-blue-700 ring-1 ring-blue-200'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <span className="block">{PRESET_LABELS[p]}</span>
              <span className="text-xs text-slate-400">{PRESET_DESCRIPTIONS[p]}</span>
            </button>
          ))}
        </div>
      </section>

      <section>
        <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">Entity type</h3>
        <div className="space-y-1">
          {(['book', 'member', 'transaction'] as SearchEntityType[]).map((type) => {
            const count = facets?.entityTypes.find((f) => f.value === type)?.count
            const implied = impliedTypes.includes(type)
            const checked = selectedTypes.includes(type) || implied
            return (
              <label
                key={type}
                className={`flex items-center gap-2 rounded-lg px-2 py-1.5 ${
                  implied ? 'cursor-default opacity-80' : 'cursor-pointer hover:bg-slate-50'
                }`}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  disabled={Boolean(preset)}
                  onChange={() => toggleType(type)}
                  className="rounded border-slate-300"
                />
                <span className="flex-1 text-sm text-slate-700">{ENTITY_TYPE_LABELS[type]}</span>
                {count !== undefined && <span className="text-xs text-slate-400">{count}</span>}
              </label>
            )
          })}
        </div>
        {preset && (
          <p className="mt-1.5 px-2 text-xs text-slate-400">
            Entity type is set by the selected quick filter.
          </p>
        )}
      </section>

      {facets && facets.genres.length > 0 && (
        <section>
          <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">Genre</h3>
          <div className="flex flex-wrap gap-1.5">
            {facets.genres.map((g) => (
              <button
                key={g.value}
                type="button"
                onClick={() => setGenre(genre === g.value ? null : g.value)}
                className={`rounded-full px-2.5 py-1 text-xs ${
                  genre === g.value
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {g.value} ({g.count})
              </button>
            ))}
          </div>
        </section>
      )}

      {facets && facets.categories.length > 0 && (
        <section>
          <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">Category</h3>
          <div className="space-y-1">
            {facets.categories.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setCategoryId(categoryId === c.id ? null : c.id)}
                className={`flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-sm ${
                  categoryId === c.id ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                {c.name}
                <span className="text-xs text-slate-400">{c.count}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      {facets && facets.memberTypes.length > 0 && (
        <section>
          <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">Member type</h3>
          <div className="space-y-1">
            {facets.memberTypes.map((m) => (
              <button
                key={m.value}
                type="button"
                onClick={() => setMemberType(memberType === m.value ? null : m.value)}
                className={`flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-sm capitalize ${
                  memberType === m.value ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                {m.value}
                <span className="text-xs text-slate-400">{m.count}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      {status && (
        <div className="flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-2 text-sm">
          Status: {status}
          <button type="button" onClick={() => setStatus(null)} aria-label="Clear status">
            <X className="h-3 w-3" />
          </button>
        </div>
      )}
    </aside>
  )
}
