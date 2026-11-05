import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { AppShell } from '@/components/app-shell'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { searchOpac } from '@/lib/opac-api'

export function SearchPage() {
  const [q, setQ] = useState('')
  const [search, setSearch] = useState('')

  const { data = [], isFetching, isError } = useQuery({
    queryKey: ['public-opac', search],
    queryFn: () => searchOpac(search),
    enabled: search.length > 0,
  })

  return (
    <AppShell>
      <Card className="animate-fade-up animate-fade-up-delay-1">
        <CardContent className="p-6">
          <form
            className="flex flex-col gap-3 sm:flex-row"
            onSubmit={(e) => {
              e.preventDefault()
              setSearch(q.trim())
            }}
          >
            <Input
              className="h-12 flex-1 bg-white shadow-[var(--shadow-soft)]"
              placeholder="Search title, author, subject, call number…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            <Button type="submit" size="lg" className="h-12 rounded-full px-8">
              Search
            </Button>
          </form>
        </CardContent>
      </Card>

      {isFetching && (
        <p className="mt-6 text-sm text-[var(--color-muted-foreground)]">Searching…</p>
      )}
      {isError && <p className="mt-6 text-sm text-rose-600">Search failed.</p>}

      <div className="mt-6 space-y-3 animate-fade-up animate-fade-up-delay-2">
        {data.map((book) => (
          <Link key={book.id} to={`/books/${book.id}`} className="block">
            <Card className="transition hover:-translate-y-0.5 hover:ring-2 hover:ring-[var(--color-primary)]/20">
              <CardContent className="px-5 py-4">
                <h2 className="font-semibold text-[var(--color-ink)]">{book.title}</h2>
                <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
                  {book.authors || 'Unknown author'}
                  {book.publicationYear ? ` · ${book.publicationYear}` : ''}
                  {typeof book.availableCopies === 'number'
                    ? ` · ${book.availableCopies} available`
                    : ''}
                </p>
              </CardContent>
            </Card>
          </Link>
        ))}
        {search && !isFetching && data.length === 0 && (
          <Card>
            <CardContent className="py-8 text-center text-sm text-[var(--color-muted-foreground)]">
              No results.
            </CardContent>
          </Card>
        )}
      </div>
    </AppShell>
  )
}
