import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  addReadingListItem,
  createReadingList,
  deleteReadingList,
  fetchPortalMe,
  fetchReadingLists,
  portalRenewLoan,
  removeReadingListItem,
} from '@/lib/portal-api'
import { toast } from '@/lib/sweet-alert'
import { formatCents } from '@/types/fines'

export function PortalPage() {
  const qc = useQueryClient()
  const [listName, setListName] = useState('')
  const [bookIds, setBookIds] = useState<Record<string, string>>({})

  const { data, isLoading, error } = useQuery({
    queryKey: ['portal', 'me'],
    queryFn: fetchPortalMe,
  })

  const listsQuery = useQuery({
    queryKey: ['portal', 'reading-lists'],
    queryFn: fetchReadingLists,
    enabled: Boolean(data),
  })

  const renewMut = useMutation({
    mutationFn: (id: string) => portalRenewLoan(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['portal'] })
      toast.success('Loan renewed')
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Renewal failed'),
  })

  const createListMut = useMutation({
    mutationFn: (name: string) => createReadingList(name),
    onSuccess: () => {
      setListName('')
      qc.invalidateQueries({ queryKey: ['portal', 'reading-lists'] })
      toast.success('Reading list created')
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Could not create list'),
  })

  const deleteListMut = useMutation({
    mutationFn: (listId: string) => deleteReadingList(listId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['portal', 'reading-lists'] })
      toast.success('Reading list deleted')
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Could not delete list'),
  })

  const addItemMut = useMutation({
    mutationFn: ({ listId, bookId }: { listId: string; bookId: string }) =>
      addReadingListItem(listId, bookId),
    onSuccess: (_data, vars) => {
      setBookIds((prev) => ({ ...prev, [vars.listId]: '' }))
      qc.invalidateQueries({ queryKey: ['portal', 'reading-lists'] })
      toast.success('Book added to list')
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Could not add book'),
  })

  const removeItemMut = useMutation({
    mutationFn: ({ listId, itemId }: { listId: string; itemId: string }) =>
      removeReadingListItem(listId, itemId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['portal', 'reading-lists'] })
      toast.success('Book removed')
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Could not remove book'),
  })

  if (isLoading) {
    return <p className="text-sm text-slate-500">Loading your library account...</p>
  }

  if (error || !data) {
    return (
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">My Library</h1>
        <p className="text-sm text-slate-500">
          No member profile is linked to this login. Ask staff to match your email to a member
          record.
        </p>
      </div>
    )
  }

  const fineTotal = data.outstandingFines.reduce((sum, f) => sum + f.balanceCents, 0)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">My Library</h1>
        <p className="text-sm text-slate-500">
          {data.member.fullName} · Card {data.member.libraryCardNumber}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase text-slate-500">Status</p>
            <p className="mt-1 font-semibold">{data.member.membershipStatus}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase text-slate-500">Can borrow</p>
            <p className="mt-1 font-semibold">{data.canBorrow ? 'Yes' : 'Blocked'}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase text-slate-500">Outstanding fines</p>
            <p className="mt-1 font-semibold">{formatCents(fineTotal)}</p>
          </CardContent>
        </Card>
      </div>

      {data.outstandingFines.length > 0 && (
        <Card>
          <CardContent className="space-y-3 p-4">
            <h2 className="font-semibold">Fine details</h2>
            {data.outstandingFines.map((fine) => (
              <div
                key={fine.id}
                className="flex items-center justify-between gap-3 border-b border-slate-100 py-2 text-sm last:border-0"
              >
                <div>
                  <p className="font-medium">{fine.bookTitle || fine.reason}</p>
                  <p className="text-xs text-slate-500 capitalize">{fine.reason}</p>
                </div>
                <p className="font-semibold">{formatCents(fine.balanceCents)}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="space-y-3 p-4">
          <h2 className="font-semibold">Active loans</h2>
          {data.activeLoans.length === 0 ? (
            <p className="text-sm text-slate-500">No active loans.</p>
          ) : (
            data.activeLoans.map((loan) => (
              <div key={loan.id} className="flex items-center justify-between gap-3 border-b border-slate-100 py-2">
                <div>
                  <p className="font-medium">{loan.bookTitle}</p>
                  <p className="text-xs text-slate-500">
                    Due {loan.dueAt ? new Date(loan.dueAt).toLocaleDateString() : '—'} ·{' '}
                    {loan.status}
                  </p>
                </div>
                {loan.status === 'borrowed' && (
                  <Button size="sm" variant="outline" onClick={() => renewMut.mutate(loan.id)}>
                    Renew
                  </Button>
                )}
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-3 p-4">
          <h2 className="font-semibold">Reservations</h2>
          {data.reservations.length === 0 ? (
            <p className="text-sm text-slate-500">No active reservations.</p>
          ) : (
            data.reservations.map((r) => (
              <div key={r.id} className="border-b border-slate-100 py-2 text-sm">
                <p className="font-medium">{r.bookTitle}</p>
                <p className="text-slate-500">
                  {r.status} · queue #{r.queuePosition}
                </p>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-4 p-4">
          <h2 className="font-semibold">Reading lists</h2>

          <form
            className="flex flex-col gap-2 sm:flex-row"
            onSubmit={(e) => {
              e.preventDefault()
              const name = listName.trim()
              if (!name) return
              createListMut.mutate(name)
            }}
          >
            <Input
              value={listName}
              onChange={(e) => setListName(e.target.value)}
              placeholder="New list name"
            />
            <Button type="submit" disabled={createListMut.isPending || !listName.trim()}>
              Create list
            </Button>
          </form>

          {listsQuery.isLoading ? (
            <p className="text-sm text-slate-500">Loading lists...</p>
          ) : (listsQuery.data ?? []).length === 0 ? (
            <p className="text-sm text-slate-500">No reading lists yet.</p>
          ) : (
            (listsQuery.data ?? []).map((list) => (
              <div key={list.id} className="space-y-2 rounded-xl bg-[var(--color-primary-soft)]/50 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">{list.name}</p>
                    {list.description && (
                      <p className="text-xs text-slate-500">{list.description}</p>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => deleteListMut.mutate(list.id)}
                    disabled={deleteListMut.isPending}
                  >
                    Delete
                  </Button>
                </div>

                {list.items.length === 0 ? (
                  <p className="text-xs text-slate-500">No books in this list.</p>
                ) : (
                  list.items.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between gap-3 border-b border-white/60 py-1.5 text-sm last:border-0"
                    >
                      <p>{item.title ?? item.bookId}</p>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          removeItemMut.mutate({ listId: list.id, itemId: item.id })
                        }
                        disabled={removeItemMut.isPending}
                      >
                        Remove
                      </Button>
                    </div>
                  ))
                )}

                <form
                  className="flex flex-col gap-2 pt-1 sm:flex-row"
                  onSubmit={(e) => {
                    e.preventDefault()
                    const bookId = (bookIds[list.id] ?? '').trim()
                    if (!bookId) return
                    addItemMut.mutate({ listId: list.id, bookId })
                  }}
                >
                  <Input
                    value={bookIds[list.id] ?? ''}
                    onChange={(e) =>
                      setBookIds((prev) => ({ ...prev, [list.id]: e.target.value }))
                    }
                    placeholder="Book ID"
                  />
                  <Button
                    type="submit"
                    size="sm"
                    variant="outline"
                    disabled={addItemMut.isPending || !(bookIds[list.id] ?? '').trim()}
                  >
                    Add book
                  </Button>
                </form>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  )
}
