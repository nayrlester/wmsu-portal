import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { SaveToReadingList } from '@/pages/reading-lists-page'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AppShell } from '@/components/app-shell'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { getOpacBook, getOpacCitations, placePortalHold } from '@/lib/opac-api'
import { useOpacSessionStore } from '@/stores/opac-session-store'

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
        <>
          <Link to="/" className="text-[var(--color-primary)] hover:underline">
            ← Back to search
          </Link>
          <Link to="/lists" className="shrink-0 whitespace-nowrap text-[var(--color-muted-foreground)] hover:text-[var(--color-primary)]">
            My lists
          </Link>
          <Link to="/loans" className="shrink-0 whitespace-nowrap text-[var(--color-muted-foreground)] hover:text-[var(--color-primary)]">
            My loans
          </Link>
          <Link to="/request" className="text-[var(--color-muted-foreground)] hover:text-[var(--color-primary)]">
            Request a title
          </Link>
        </>
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
            <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-[var(--color-primary)]">
              {book.detailProfile === 'thesis' ? 'Dissertation / thesis' : 'Catalog item'}
              {book.materialType ? ` · ${book.materialType}` : ''}
            </p>
            {book.detailProfile === 'thesis' ? (
              <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
                <Detail label="Degree" value={book.degree} />
                <Detail label="Department" value={book.department} />
                <Detail label="Adviser" value={book.advisor} />
              </dl>
            ) : (
              <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
                <Detail label="ISBN" value={book.isbn13} />
                <Detail label="Publisher" value={book.publisher} />
                <Detail label="Year" value={book.publicationYear ? String(book.publicationYear) : null} />
              </dl>
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
                Shelves: {book.shelfLocations.join(', ')}{' '}
                <Link
                  to={`/locate?q=${encodeURIComponent(book.shelfLocations[0])}`}
                  className="whitespace-nowrap font-medium text-[var(--color-primary)] hover:underline"
                >
                  Show on the floor plan
                </Link>
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
            <SaveToReadingList bookId={book.id} />
            <PlaceHold bookId={book.id} availableCopies={book.availableCopies ?? 0} />
          </CardContent>
        </Card>
      )}
    </AppShell>
  )
}

function holdError(error: unknown) {
  const data = (error as { response?: { data?: { message?: string } } })?.response?.data
  return data?.message || 'Could not place this hold.'
}

function PlaceHold({ bookId, availableCopies }: { bookId: string; availableCopies: number }) {
  const signedIn = useOpacSessionStore((state) => Boolean(state.accessToken))
  const queryClient = useQueryClient()
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const hold = useMutation({
    mutationFn: () => placePortalHold(bookId),
    onSuccess: async (reservation) => {
      setError(null)
      const place = reservation.queuePosition ? ` You are number ${reservation.queuePosition} in the queue.` : ''
      setMessage(
        reservation.status === 'ready'
          ? `A copy is ready for pickup.${place}`
          : `Hold placed.${place} The library will notify you when a copy is ready.`
      )
      await queryClient.invalidateQueries({ queryKey: ['opac-portal-account'] })
    },
    onError: (err) => {
      setMessage(null)
      setError(holdError(err))
    },
  })

  return (
    <section className="mt-8 border-t border-[var(--color-border)] pt-6">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--color-muted-foreground)]">
        Hold
      </h2>
      {!signedIn ? (
        <p className="mt-3 text-sm text-[var(--color-muted-foreground)]">
          Sign in through the WMSU Portal, then open this title again, to place a hold.
        </p>
      ) : (
        <>
          <p className="mt-3 text-sm text-[var(--color-muted-foreground)]">
            {availableCopies > 0
              ? 'Place a hold to keep the next available copy for pickup.'
              : 'All copies are out. Place a hold and the library will notify you when one is ready.'}
          </p>
          <Button type="button" className="mt-4" disabled={hold.isPending} onClick={() => hold.mutate()}>
            Place a hold
          </Button>
        </>
      )}
      {message ? <p className="mt-3 text-sm text-emerald-700">{message}</p> : null}
      {error ? <p className="mt-3 text-sm text-rose-600">{error}</p> : null}
    </section>
  )
}

function Detail({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="rounded-2xl bg-[var(--color-primary-soft)] px-4 py-3">
      <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--color-muted-foreground)]">
        {label}
      </dt>
      <dd className="mt-1 text-[var(--color-ink)]">{value || 'Not recorded'}</dd>
    </div>
  )
}
