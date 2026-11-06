import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { AppShell } from '@/components/app-shell'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { searchOpac, type OpacSearchQuery } from '@/lib/opac-api'

const emptyQuery: OpacSearchQuery = {
  q: '',
  title: '',
  author: '',
  subject: '',
  callNumber: '',
  year: '',
  isbn: '',
  language: '',
  resourceType: 'all',
  availability: 'any',
}

function hasCriteria(query: OpacSearchQuery) {
  return Object.entries(query).some(([key, value]) => {
    if (key === 'resourceType' || key === 'availability') return false
    return Boolean(value?.trim())
  })
}

export function SearchPage() {
  const [draft, setDraft] = useState<OpacSearchQuery>(emptyQuery)
  const [search, setSearch] = useState<OpacSearchQuery | null>(null)

  const { data = [], isFetching, isError } = useQuery({
    queryKey: ['public-opac', search],
    queryFn: () => searchOpac(search ?? emptyQuery),
    enabled: Boolean(search && hasCriteria(search)),
  })

  const setField = (key: keyof OpacSearchQuery, value: string) => {
    setDraft((current) => ({ ...current, [key]: value }))
  }

  return (
    <AppShell>
      <Card className="animate-fade-up animate-fade-up-delay-1">
        <CardContent className="p-6">
          <h1 className="text-xl font-semibold text-[var(--color-ink)]">Catalog search</h1>
          <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
            Search by keyword, title, author, subject, call number, year, or ISBN/ISSN.
          </p>
          <form
            className="mt-4 grid gap-3 sm:grid-cols-2"
            onSubmit={(event) => {
              event.preventDefault()
              setSearch({ ...draft })
            }}
          >
            <label className="sm:col-span-2 text-sm">
              <span className="mb-1 block text-xs font-medium text-[var(--color-muted-foreground)]">Keyword</span>
              <Input
                className="h-12 bg-white shadow-[var(--shadow-soft)]"
                placeholder="Title, author, subject, ISBN, call number"
                value={draft.q}
                onChange={(event) => setField('q', event.target.value)}
              />
            </label>
            <Field label="Title" value={draft.title ?? ''} onChange={(value) => setField('title', value)} />
            <Field label="Author" value={draft.author ?? ''} onChange={(value) => setField('author', value)} />
            <Field label="Subject" value={draft.subject ?? ''} onChange={(value) => setField('subject', value)} />
            <Field
              label="Call number"
              value={draft.callNumber ?? ''}
              onChange={(value) => setField('callNumber', value)}
            />
            <Field label="Year" value={draft.year ?? ''} onChange={(value) => setField('year', value)} />
            <Field label="ISBN / ISSN" value={draft.isbn ?? ''} onChange={(value) => setField('isbn', value)} />
            <Field label="Language" value={draft.language ?? ''} onChange={(value) => setField('language', value)} />
            <label className="text-sm">
              <span className="mb-1 block text-xs font-medium text-[var(--color-muted-foreground)]">Resource type</span>
              <select
                className="h-11 w-full rounded-full bg-[var(--color-primary-soft)] px-4 text-sm"
                value={draft.resourceType}
                onChange={(event) => setField('resourceType', event.target.value)}
              >
                <option value="all">All</option>
                <option value="physical">Physical</option>
                <option value="digital">Digital</option>
              </select>
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-xs font-medium text-[var(--color-muted-foreground)]">Availability</span>
              <select
                className="h-11 w-full rounded-full bg-[var(--color-primary-soft)] px-4 text-sm"
                value={draft.availability}
                onChange={(event) => setField('availability', event.target.value)}
              >
                <option value="any">Any</option>
                <option value="available">Available copies only</option>
              </select>
            </label>
            <div className="sm:col-span-2">
              <Button type="submit" size="lg" className="h-12 rounded-full px-8" disabled={isFetching}>
                Search
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {isFetching && <p className="mt-6 text-sm text-[var(--color-muted-foreground)]">Searching the catalog…</p>}
      {isError && <p className="mt-6 text-sm text-rose-600">Catalog search failed. Try again.</p>}

      <div className="mt-6 space-y-3 animate-fade-up animate-fade-up-delay-2">
        {data.map((book) => (
          <Link key={book.id} to={`/books/${book.id}`} className="block">
            <Card className="transition hover:-translate-y-0.5 hover:ring-2 hover:ring-[var(--color-primary)]/20">
              <CardContent className="px-5 py-4">
                <h2 className="font-semibold text-[var(--color-ink)]">{book.title}</h2>
                <p className="mt-1 text-xs font-medium uppercase tracking-wide text-[var(--color-primary)]">
                  {book.detailProfile === 'thesis' ? 'Dissertation / thesis' : 'Catalog item'}
                </p>
                <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
                  {book.authors || 'Unknown author'}
                  {book.publicationYear ? ` · ${book.publicationYear}` : ''}
                  {book.callNumber ? ` · ${book.callNumber}` : ''}
                  {typeof book.availableCopies === 'number' ? ` · ${book.availableCopies} available` : ''}
                </p>
              </CardContent>
            </Card>
          </Link>
        ))}
        {search && !isFetching && !isError && data.length === 0 && (
          <Card>
            <CardContent className="py-8 text-center text-sm text-[var(--color-muted-foreground)]">
              No catalog records matched these filters.
            </CardContent>
          </Card>
        )}
      </div>
    </AppShell>
  )
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (value: string) => void
}) {
  return (
    <label className="text-sm">
      <span className="mb-1 block text-xs font-medium text-[var(--color-muted-foreground)]">{label}</span>
      <Input value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  )
}
