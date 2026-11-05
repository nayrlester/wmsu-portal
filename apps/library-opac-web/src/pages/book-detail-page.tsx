import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { AppShell } from '@/components/app-shell'
import { Card, CardContent } from '@/components/ui/card'
import { getOpacBook, getOpacCitations } from '@/lib/opac-api'

export function BookDetailPage() {
  const { id = '' } = useParams()

  const bookQuery = useQuery({
    queryKey: ['public-opac-book', id],
    queryFn: () => getOpacBook(id),
    enabled: Boolean(id),
  })

  const citeQuery = useQuery({
    queryKey: ['public-opac-cite', id],
    queryFn: () => getOpacCitations(id),
    enabled: Boolean(id),
  })

  const book = bookQuery.data
  const citations = citeQuery.data ?? book?.citations

  return (
    <AppShell
      nav={
        <Link to="/" className="text-[var(--color-primary)] hover:underline">
          ← Back to search
        </Link>
      }
    >
      {bookQuery.isFetching && (
        <p className="text-sm text-[var(--color-muted-foreground)]">Loading…</p>
      )}
      {bookQuery.isError && (
        <p className="text-sm text-rose-600">Unable to load this title.</p>
      )}

      {book && (
        <Card className="animate-fade-up">
          <CardContent className="p-8">
            <h1 className="text-3xl font-bold tracking-tight text-[var(--color-ink)]">
              {book.title}
            </h1>
            {book.subtitle && (
              <p className="mt-1 text-lg text-[var(--color-muted-foreground)]">{book.subtitle}</p>
            )}
            <p className="mt-4 text-sm text-[var(--color-muted-foreground)]">
              {book.authors || 'Unknown author'}
              {book.publisher ? ` · ${book.publisher}` : ''}
              {book.category ? ` · ${book.category}` : ''}
            </p>
            <p className="mt-2 text-sm">
              <span
                className={
                  book.availability === 'available'
                    ? 'font-medium text-emerald-700'
                    : 'font-medium text-rose-600'
                }
              >
                {book.availableCopies ?? 0} of {book.totalCopies ?? 0} available
              </span>
              {book.callNumber ? ` · Call number ${book.callNumber}` : ''}
              {book.isbn13 ? ` · ISBN ${book.isbn13}` : ''}
            </p>

            {book.description && (
              <p className="mt-6 text-[15px] leading-relaxed text-[var(--color-ink)]">
                {book.description}
              </p>
            )}

            {book.shelfLocations && book.shelfLocations.length > 0 && (
              <p className="mt-4 text-sm text-[var(--color-muted-foreground)]">
                Shelves: {book.shelfLocations.join(', ')}
              </p>
            )}

            {(citations?.apa || citations?.mla) && (
              <section className="mt-8 border-t border-[var(--color-border)] pt-6">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--color-muted-foreground)]">
                  Citations
                </h2>
                {citations.apa && (
                  <div className="mt-3 rounded-2xl bg-[var(--color-primary-soft)] px-4 py-3">
                    <p className="text-xs font-semibold text-[var(--color-primary)]">APA</p>
                    <p className="mt-1 text-sm leading-relaxed text-[var(--color-ink)]">
                      {citations.apa}
                    </p>
                  </div>
                )}
                {citations.mla && (
                  <div className="mt-3 rounded-2xl bg-[var(--color-primary-soft)] px-4 py-3">
                    <p className="text-xs font-semibold text-[var(--color-primary)]">MLA</p>
                    <p className="mt-1 text-sm leading-relaxed text-[var(--color-ink)]">
                      {citations.mla}
                    </p>
                  </div>
                )}
              </section>
            )}
          </CardContent>
        </Card>
      )}
    </AppShell>
  )
}
