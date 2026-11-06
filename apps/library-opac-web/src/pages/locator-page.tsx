import { useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { AppShell } from '@/components/app-shell'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { fetchLocator, type LocatorShelf } from '@/lib/opac-api'

const statusLabel: Record<string, string> = {
  available: 'Available',
  on_loan: 'On loan',
  reserved: 'Reserved',
  maintenance: 'In maintenance',
  damaged: 'Damaged',
  under_repair: 'Under repair',
  lost: 'Lost',
  withdrawn: 'Withdrawn',
}

function placeLabel(item: {
  floor: string | null
  aisle: string | null
  shelf: string | null
  shelfLocation: string | null
}) {
  const parts = [
    item.floor ? `Floor ${item.floor}` : null,
    item.aisle ? `aisle ${item.aisle}` : null,
    item.shelf ? `shelf ${item.shelf}` : null,
  ].filter(Boolean)
  if (parts.length) return parts.join(', ')
  return item.shelfLocation ? `shelf ${item.shelfLocation}` : 'an unassigned shelf'
}

function statusText(status: string) {
  return statusLabel[status] || status
}

export function LocatorPage() {
  const [params, setParams] = useSearchParams()
  const q = params.get('q')?.trim() ?? ''
  const [draft, setDraft] = useState(q)
  const locator = useQuery({
    queryKey: ['public-locator', q],
    queryFn: () => fetchLocator(q),
    enabled: q.length >= 2,
  })

  function search(event: FormEvent) {
    event.preventDefault()
    const next = draft.trim()
    if (next.length < 2) return
    setParams({ q: next })
  }

  const matches = locator.data?.matches ?? []
  const shelves = locator.data?.shelves ?? []
  const active = new Set(matches.map((match) => match.shelfLocation).filter(Boolean))
  const floors = groupShelves(shelves)

  return (
    <AppShell>
      <Card>
        <CardContent className="p-6">
          <h1 className="text-xl font-semibold text-[var(--color-ink)]">Find a shelf</h1>
          <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
            Search a title, barcode, or shelf code. The floor plan uses the shelf recorded on each copy.
          </p>
          <form onSubmit={search} className="mt-4 flex flex-col gap-3 sm:flex-row">
            <Input
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Title, barcode, or shelf"
              aria-label="Shelf search"
            />
            <Button type="submit" className="shrink-0 whitespace-nowrap">
              Show location
            </Button>
          </form>
          {locator.isError ? (
            <p className="mt-4 text-sm text-rose-600">Could not load shelf locations.</p>
          ) : null}
        </CardContent>
      </Card>

      {q.length >= 2 && locator.data ? (
        <>
          <Card className="mt-4">
            <CardContent className="p-6">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--color-muted-foreground)]">
                Floor plan
              </h2>
              <div className="mt-4 space-y-4">
                {floors.map((group) => (
                  <div key={group.name}>
                    <p className="text-xs font-medium text-[var(--color-muted-foreground)]">{group.name}</p>
                    <div className="mt-2 flex flex-wrap gap-3">
                      {group.shelves.map((shelf) => {
                        const highlighted = active.has(shelf.code)
                        return (
                          <div
                            key={shelf.code}
                            className={`min-w-28 rounded-2xl border px-4 py-3 ${
                              highlighted
                                ? 'border-[var(--color-primary)] bg-[var(--color-primary-soft)]'
                                : 'border-[var(--color-border)] bg-white'
                            }`}
                          >
                            <p className="whitespace-nowrap font-mono text-sm font-semibold text-[var(--color-ink)]">
                              {shelf.code}
                            </p>
                            <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">
                              {shelf.availableCount} of {shelf.copyCount} available
                            </p>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="mt-4">
            <CardContent className="space-y-4 p-6">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--color-muted-foreground)]">
                Copies
              </h2>
              {matches.length === 0 ? (
                <p className="text-sm text-[var(--color-muted-foreground)]">No copies match this search.</p>
              ) : (
                matches.map((match) => (
                  <div key={match.copyId} className="rounded-2xl bg-[var(--color-primary-soft)] px-4 py-3">
                    <Link
                      to={`/books/${match.bookId}`}
                      className="font-medium text-[var(--color-ink)] hover:text-[var(--color-primary)]"
                    >
                      {match.bookTitle || 'Untitled'}
                    </Link>
                    <p className="mt-1 text-sm text-[var(--color-ink)]">
                      {match.bookTitle || 'This copy'} is at{' '}
                      <span className="whitespace-nowrap">{placeLabel(match)}</span>. {statusText(match.status)}.
                    </p>
                    <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
                      <span className="whitespace-nowrap">{match.barcode}</span>
                      {match.shelfLocation ? (
                        <>
                          {' · '}
                          <span className="whitespace-nowrap">Shelf {match.shelfLocation}</span>
                        </>
                      ) : null}
                    </p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </>
      ) : null}
    </AppShell>
  )
}

function groupShelves(shelves: LocatorShelf[]) {
  const groups = new Map<string, LocatorShelf[]>()
  for (const shelf of shelves) {
    const name = shelf.floor ? `Floor ${shelf.floor}` : 'Shelves'
    const list = groups.get(name) ?? []
    list.push(shelf)
    groups.set(name, list)
  }
  return [...groups.entries()].map(([name, rows]) => ({ name, shelves: rows }))
}
