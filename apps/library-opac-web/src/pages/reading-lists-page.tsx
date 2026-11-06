import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AppShell } from '@/components/app-shell'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { fetchReadingLists, removeReadingListItem } from '@/lib/opac-api'
import { useOpacSessionStore } from '@/stores/opac-session-store'

function errorText(error: unknown) {
  const data = (error as { response?: { data?: { message?: string } } })?.response?.data
  return data?.message || 'Could not load reading lists.'
}

export function ReadingListsPage() {
  const signedIn = useOpacSessionStore((state) => Boolean(state.accessToken))
  const queryClient = useQueryClient()
  const [message, setMessage] = useState<string | null>(null)

  const listsQuery = useQuery({
    queryKey: ['opac-reading-lists'],
    queryFn: fetchReadingLists,
    enabled: signedIn,
    retry: false,
  })

  const removeItem = useMutation({
    mutationFn: ({ listId, itemId }: { listId: string; itemId: string }) =>
      removeReadingListItem(listId, itemId),
    onSuccess: async () => {
      setMessage(null)
      await queryClient.invalidateQueries({ queryKey: ['opac-reading-lists'] })
    },
    onError: (error) => setMessage(errorText(error)),
  })

  return (
    <AppShell>
      <Card>
        <CardContent className="p-6">
          <h1 className="text-xl font-semibold text-[var(--color-ink)]">My reading lists</h1>
          <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
            Titles you save from the catalog stay on your library member profile.
          </p>
          {!signedIn ? (
            <p className="mt-4 text-sm text-[var(--color-muted-foreground)]">
              Sign in through the WMSU Portal, then open the OPAC again, to view and edit lists.
            </p>
          ) : null}
          {listsQuery.isError ? (
            <p className="mt-4 text-sm text-rose-600">{errorText(listsQuery.error)}</p>
          ) : null}
          {message ? <p className="mt-4 text-sm text-rose-600">{message}</p> : null}
        </CardContent>
      </Card>

      <div className="mt-4 space-y-3">
        {(listsQuery.data ?? []).map((list) => (
          <Card key={list.id}>
            <CardContent className="p-5">
              <h2 className="font-semibold text-[var(--color-ink)]">{list.name}</h2>
              {list.items.length === 0 ? (
                <p className="mt-2 text-sm text-[var(--color-muted-foreground)]">No titles saved yet.</p>
              ) : (
                <ul className="mt-3 space-y-2">
                  {list.items.map((item) => (
                    <li key={item.id} className="flex items-center justify-between gap-3 text-sm">
                      <Link to={`/books/${item.bookId}`} className="text-[var(--color-primary)] hover:underline">
                        {item.title || 'Untitled'}
                      </Link>
                      <Button
                        type="button"
                        variant="outline"
                        disabled={removeItem.isPending}
                        onClick={() => removeItem.mutate({ listId: list.id, itemId: item.id })}
                      >
                        Remove
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        ))}
        {signedIn && listsQuery.isSuccess && (listsQuery.data ?? []).length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-sm text-[var(--color-muted-foreground)]">
              No reading lists yet. Open a title and save it.
            </CardContent>
          </Card>
        ) : null}
      </div>
    </AppShell>
  )
}

export function SaveToReadingList({ bookId }: { bookId: string }) {
  const signedIn = useOpacSessionStore((state) => Boolean(state.accessToken))
  const queryClient = useQueryClient()
  const [listName, setListName] = useState('My list')
  const [listId, setListId] = useState('')
  const [notice, setNotice] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const listsQuery = useQuery({
    queryKey: ['opac-reading-lists'],
    queryFn: fetchReadingLists,
    enabled: signedIn,
    retry: false,
  })

  const save = useMutation({
    mutationFn: async () => {
      const { addBookToReadingList, createReadingList } = await import('@/lib/opac-api')
      const targetId =
        listId ||
        (await createReadingList(listName.trim() || 'My list')).id
      return addBookToReadingList(targetId, bookId)
    },
    onSuccess: async (list) => {
      setError(null)
      setNotice(`Saved to ${list.name}.`)
      setListId(list.id)
      await queryClient.invalidateQueries({ queryKey: ['opac-reading-lists'] })
    },
    onError: (err) => {
      setNotice(null)
      setError(errorText(err))
    },
  })

  if (!signedIn) {
    return (
      <p className="mt-6 text-sm text-[var(--color-muted-foreground)]">
        Sign in through the WMSU Portal to save this title to a reading list.
      </p>
    )
  }

  const lists = listsQuery.data ?? []

  return (
    <section className="mt-8 border-t border-[var(--color-border)] pt-6">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--color-muted-foreground)]">
        Reading list
      </h2>
      {listsQuery.isError ? <p className="mt-3 text-sm text-rose-600">{errorText(listsQuery.error)}</p> : null}
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        {lists.length > 0 ? (
          <select
            className="h-11 rounded-full bg-[var(--color-primary-soft)] px-4 text-sm"
            value={listId}
            onChange={(event) => setListId(event.target.value)}
          >
            <option value="">New list</option>
            {lists.map((list) => (
              <option key={list.id} value={list.id}>
                {list.name}
              </option>
            ))}
          </select>
        ) : null}
        {listId === '' ? (
          <Input value={listName} onChange={(event) => setListName(event.target.value)} aria-label="New list name" />
        ) : null}
        <Button type="button" disabled={save.isPending} onClick={() => save.mutate()}>
          Save title
        </Button>
      </div>
      {notice ? <p className="mt-3 text-sm text-emerald-700">{notice}</p> : null}
      {error ? <p className="mt-3 text-sm text-rose-600">{error}</p> : null}
    </section>
  )
}
