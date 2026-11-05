import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { fetchOpacBook, searchOpac } from '@/lib/opac-api'
import {
  addReadingListItem,
  fetchReadingLists,
  portalReserve,
  type ReadingList,
} from '@/lib/portal-api'
import { useAuthStore } from '@/stores/auth-store'
import { toast } from '@/lib/sweet-alert'

export function OpacPage() {
  const user = useAuthStore((s) => s.user)
  const [q, setQ] = useState('')
  const [submitted, setSubmitted] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [selectedListId, setSelectedListId] = useState('')
  const [adding, setAdding] = useState(false)

  const canReserve = user?.permissions.includes('reservations:create')

  const { data, isLoading } = useQuery({
    queryKey: ['opac', submitted],
    queryFn: () => searchOpac({ q: submitted || undefined, availability: 'any' }),
    enabled: true,
  })

  const { data: detail } = useQuery({
    queryKey: ['opac-book', selectedId],
    queryFn: () => fetchOpacBook(selectedId!),
    enabled: Boolean(selectedId),
  })

  const listsQuery = useQuery({
    queryKey: ['portal', 'reading-lists'],
    queryFn: fetchReadingLists,
    enabled: Boolean(user),
  })

  const lists: ReadingList[] = listsQuery.data ?? []

  async function handleAddToList() {
    if (!detail || !selectedListId) return
    setAdding(true)
    try {
      await addReadingListItem(selectedListId, detail.id)
      toast.success('Added to reading list')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not add to list')
    } finally {
      setAdding(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">OPAC</h1>
        <p className="text-sm text-slate-500">Online Public Access Catalog</p>
      </div>

      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          setSubmitted(q.trim())
        }}
      >
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            className="pl-9"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by keyword, title, author, subject..."
          />
        </div>
        <Button type="submit">Search</Button>
      </form>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardContent className="p-0">
            {isLoading ? (
              <p className="p-6 text-sm text-slate-500">Searching...</p>
            ) : (
              <div className="divide-y divide-slate-100">
                {(data?.books ?? []).map((book) => (
                  <button
                    key={book.id}
                    type="button"
                    className="block w-full p-4 text-left hover:bg-slate-50"
                    onClick={() => setSelectedId(book.id)}
                  >
                    <p className="font-medium text-slate-900">{book.title}</p>
                    <p className="text-sm text-slate-500">
                      {book.authors ?? 'Unknown author'} · {book.availableCopies}/
                      {book.totalCopies} available
                    </p>
                  </button>
                ))}
                {!data?.books?.length && (
                  <p className="p-6 text-sm text-slate-500">No matching titles.</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-3 p-4">
            {!detail ? (
              <p className="text-sm text-slate-500">Select a title for details and citations.</p>
            ) : (
              <>
                <h2 className="text-lg font-semibold">{detail.title}</h2>
                <p className="text-sm text-slate-600">{detail.description ?? 'No description.'}</p>
                <p className="text-xs text-slate-500">
                  Call number: {detail.callNumber ?? '—'} · Shelf:{' '}
                  {(detail.shelfLocations ?? []).filter(Boolean).join(', ') || '—'}
                </p>
                {detail.citations && (
                  <div className="space-y-2 rounded-md bg-slate-50 p-3 text-xs text-slate-700">
                    <p>
                      <span className="font-semibold">APA:</span> {detail.citations.apa}
                    </p>
                    <p>
                      <span className="font-semibold">MLA:</span> {detail.citations.mla}
                    </p>
                  </div>
                )}
                {canReserve && detail.availability !== 'available' && (
                  <Button
                    className="w-full"
                    onClick={() =>
                      portalReserve(detail.id)
                        .then(() => toast.success('Reservation placed'))
                        .catch((err) =>
                          toast.error(err instanceof Error ? err.message : 'Reservation failed')
                        )
                    }
                  >
                    Reserve
                  </Button>
                )}
                {user && lists.length > 0 && (
                  <div className="space-y-2 border-t border-slate-100 pt-3">
                    <label className="text-xs font-medium uppercase text-slate-500">
                      Add to reading list
                    </label>
                    <select
                      className="flex h-11 w-full rounded-full border border-transparent bg-[var(--color-primary-soft)] px-4 text-sm text-[var(--color-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/35"
                      value={selectedListId}
                      onChange={(e) => setSelectedListId(e.target.value)}
                    >
                      <option value="">Select a list</option>
                      {lists.map((list) => (
                        <option key={list.id} value={list.id}>
                          {list.name}
                        </option>
                      ))}
                    </select>
                    <Button
                      className="w-full"
                      variant="outline"
                      disabled={!selectedListId || adding}
                      onClick={handleAddToList}
                    >
                      {adding ? 'Adding...' : 'Add to reading list'}
                    </Button>
                  </div>
                )}
                {user && !listsQuery.isLoading && lists.length === 0 && (
                  <p className="text-xs text-slate-500">
                    Create a reading list in My Library to save titles here.
                  </p>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
