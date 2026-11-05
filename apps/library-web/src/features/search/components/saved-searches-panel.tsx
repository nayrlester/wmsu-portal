import { useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { Bookmark, BookmarkPlus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  useCreateSavedSearch,
  useDeleteSavedSearch,
  useSavedSearches,
} from '@/hooks/use-search'
import { useSearchStore } from '@/stores/search-store'
import type { SavedSearch } from '@/types/search'

interface SavedSearchesPanelProps {
  query: string
}

export function SavedSearchesPanel({ query }: SavedSearchesPanelProps) {
  const navigate = useNavigate()
  const { data: saved, isLoading } = useSavedSearches()
  const createSaved = useCreateSavedSearch()
  const deleteSaved = useDeleteSavedSearch()
  const { selectedTypes, preset, genre, categoryId, memberType, status, applySavedFilters } =
    useSearchStore()
  const [name, setName] = useState('')
  const [showForm, setShowForm] = useState(false)

  async function handleSave() {
    if (!name.trim()) return
    await createSaved.mutateAsync({
      name: name.trim(),
      query,
      filters: {
        types: selectedTypes.length ? selectedTypes : undefined,
        preset: preset ?? undefined,
        genre: genre ?? undefined,
        categoryId: categoryId ?? undefined,
        memberType: memberType ?? undefined,
        status: status ?? undefined,
      },
    })
    setName('')
    setShowForm(false)
  }

  function openSaved(item: SavedSearch) {
    applySavedFilters(item.filters)
    const params = new URLSearchParams()
    if (item.query) params.set('q', item.query)
    if (item.filters.preset) params.set('preset', item.filters.preset)
    navigate(`/search?${params.toString()}`)
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
          <Bookmark className="h-4 w-4" />
          Saved searches
        </h3>
        <Button variant="outline" size="sm" onClick={() => setShowForm(!showForm)}>
          <BookmarkPlus className="mr-1 h-3 w-3" />
          Save
        </Button>
      </div>

      {showForm && (
        <div className="mb-3 flex gap-2">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Search name..."
            className="h-8"
          />
          <Button size="sm" onClick={handleSave} disabled={createSaved.isPending}>
            Save
          </Button>
        </div>
      )}

      {isLoading ? (
        <p className="text-sm text-slate-500">Loading...</p>
      ) : !saved?.length ? (
        <p className="text-sm text-slate-500">No saved searches yet.</p>
      ) : (
        <ul className="space-y-1">
          {saved.map((item) => (
            <li
              key={item.id}
              className="flex items-center justify-between rounded-lg px-2 py-1.5 hover:bg-slate-50"
            >
              <button
                type="button"
                className="min-w-0 flex-1 text-left text-sm text-slate-700"
                onClick={() => openSaved(item)}
              >
                <span className="block truncate font-medium">{item.name}</span>
                <span className="block truncate text-xs text-slate-400">
                  {item.query || item.filters.preset || 'Filtered'}
                </span>
              </button>
              <Button
                variant="ghost"
                size="sm"
                className="shrink-0 text-red-600"
                onClick={() => deleteSaved.mutate(item.id)}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
