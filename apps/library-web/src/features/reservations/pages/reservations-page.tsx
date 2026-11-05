import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog } from '@/components/ui/dialog'
import { DatePicker } from '@/components/ui/date-picker'
import { Label } from '@/components/ui/label'
import {
  SearchableSelect,
  type SearchableSelectOption,
} from '@/components/ui/searchable-select'
import { useBooks } from '@/hooks/use-books'
import { useMembers } from '@/hooks/use-members'
import {
  cancelReservation,
  createReservation,
  fetchReservations,
  fulfillReservation,
  type Reservation,
} from '@/lib/reservations-api'
import { useAuthStore } from '@/stores/auth-store'
import { toast } from '@/lib/sweet-alert'
import { cn } from '@/lib/utils'

function useDebouncedValue<T>(value: T, delayMs = 300) {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delayMs)
    return () => window.clearTimeout(timer)
  }, [value, delayMs])

  return debounced
}

function mergeSelectedOption(
  options: SearchableSelectOption[],
  selected: SearchableSelectOption | null
) {
  if (!selected) return options
  if (options.some((option) => option.value === selected.value)) return options
  return [selected, ...options]
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleString()
}

function formatDate(value: string | null | undefined) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function toDateInputValue(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function addDays(date: Date, days: number) {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

const DEFAULT_HOLD_DAYS = 7

function statusLabel(status: Reservation['status']) {
  return status.replace(/_/g, ' ')
}

export function ReservationsPage() {
  const user = useAuthStore((s) => s.user)
  const qc = useQueryClient()
  const [memberId, setMemberId] = useState('')
  const [bookId, setBookId] = useState('')
  const [memberSearch, setMemberSearch] = useState('')
  const [bookSearch, setBookSearch] = useState('')
  const [selectedMember, setSelectedMember] = useState<SearchableSelectOption | null>(null)
  const [selectedBook, setSelectedBook] = useState<SearchableSelectOption | null>(null)
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null)
  const [reservedAt, setReservedAt] = useState(() => toDateInputValue(new Date()))
  const [expiresAt, setExpiresAt] = useState(() =>
    toDateInputValue(addDays(new Date(), DEFAULT_HOLD_DAYS))
  )

  const debouncedMemberSearch = useDebouncedValue(memberSearch)
  const debouncedBookSearch = useDebouncedValue(bookSearch)

  const canCreate = user?.permissions.includes('reservations:create')
  const canCancel = user?.permissions.includes('reservations:cancel')
  const canFulfill = user?.permissions.includes('reservations:fulfill')

  const { data: membersData, isFetching: membersLoading } = useMembers({
    search: debouncedMemberSearch || undefined,
    membershipStatus: 'approved',
    perPage: 25,
  })

  const { data: booksData, isFetching: booksLoading } = useBooks({
    search: debouncedBookSearch || undefined,
    perPage: 25,
  })

  const memberOptions = useMemo(() => {
    const options = (membersData?.members ?? []).map((member) => ({
      value: member.id,
      label: member.fullName,
      description: [member.libraryCardNumber, member.email, member.memberType]
        .filter(Boolean)
        .join(' · '),
    }))
    return mergeSelectedOption(options, selectedMember)
  }, [membersData?.members, selectedMember])

  const bookOptions = useMemo(() => {
    const options = (booksData?.books ?? []).map((book) => ({
      value: book.id,
      label: book.title,
      description: [
        book.authors?.join(', ') || null,
        book.isbn13,
        book.availableCopies != null ? `${book.availableCopies} available` : null,
      ]
        .filter(Boolean)
        .join(' · '),
    }))
    return mergeSelectedOption(options, selectedBook)
  }, [booksData?.books, selectedBook])

  function handleMemberChange(nextId: string) {
    setMemberId(nextId)
    setSelectedMember(memberOptions.find((option) => option.value === nextId) ?? null)
  }

  function handleBookChange(nextId: string) {
    setBookId(nextId)
    setSelectedBook(bookOptions.find((option) => option.value === nextId) ?? null)
  }

  function resetHoldDates() {
    const today = new Date()
    setReservedAt(toDateInputValue(today))
    setExpiresAt(toDateInputValue(addDays(today, DEFAULT_HOLD_DAYS)))
  }

  function handleReservedAtChange(value: string) {
    setReservedAt(value)
    if (!value) return
    const start = new Date(`${value}T00:00:00`)
    if (Number.isNaN(start.getTime())) return
    const currentEnd = expiresAt ? new Date(`${expiresAt}T00:00:00`) : null
    if (!currentEnd || Number.isNaN(currentEnd.getTime()) || currentEnd <= start) {
      setExpiresAt(toDateInputValue(addDays(start, DEFAULT_HOLD_DAYS)))
    }
  }

  const { data, isLoading } = useQuery({
    queryKey: ['reservations'],
    queryFn: () => fetchReservations({ perPage: 50 }),
  })

  const createMut = useMutation({
    mutationFn: () =>
      createReservation({
        memberId,
        bookId,
        reservedAt,
        expiresAt,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['reservations'] })
      setMemberId('')
      setBookId('')
      setMemberSearch('')
      setBookSearch('')
      setSelectedMember(null)
      setSelectedBook(null)
      resetHoldDates()
      toast.success('Reservation created')
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Failed to create reservation'),
  })

  function handleCreate() {
    if (!memberId || !bookId) {
      toast.error('Select a member and a book')
      return
    }
    if (!reservedAt || !expiresAt) {
      toast.error('Select From and To dates')
      return
    }
    if (expiresAt <= reservedAt) {
      toast.error('To date must be after From date')
      return
    }
    createMut.mutate()
  }

  const cancelMut = useMutation({
    mutationFn: (id: string) => cancelReservation(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['reservations'] })
      setSelectedReservation(null)
      toast.success('Reservation cancelled')
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Failed to cancel'),
  })

  const fulfillMut = useMutation({
    mutationFn: (id: string) => fulfillReservation(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['reservations'] })
      setSelectedReservation(null)
      toast.success('Reservation fulfilled')
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Failed to fulfill'),
  })

  const openReservation =
    selectedReservation &&
    (data?.reservations.find((item) => item.id === selectedReservation.id) ?? selectedReservation)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Reservations</h1>
        <p className="text-sm text-slate-500">Hold queue for checked-out titles</p>
      </div>

      {canCreate && (
        <Card>
          <CardContent className="grid gap-3 p-4 lg:grid-cols-5">
            <div className="space-y-1.5 lg:col-span-1">
              <Label>Member</Label>
              <SearchableSelect
                options={memberOptions}
                value={memberId}
                onChange={handleMemberChange}
                onSearchChange={setMemberSearch}
                placeholder="Search member..."
                emptyMessage="No approved members found"
                isLoading={membersLoading}
              />
            </div>
            <div className="space-y-1.5 lg:col-span-1">
              <Label>Book</Label>
              <SearchableSelect
                options={bookOptions}
                value={bookId}
                onChange={handleBookChange}
                onSearchChange={setBookSearch}
                placeholder="Search book..."
                emptyMessage="No books found"
                isLoading={booksLoading}
              />
            </div>
            <div className="space-y-1.5">
              <Label>From</Label>
              <DatePicker
                value={reservedAt}
                onChange={handleReservedAtChange}
                placeholder="Start date"
              />
            </div>
            <div className="space-y-1.5">
              <Label>To</Label>
              <DatePicker
                value={expiresAt}
                min={reservedAt || undefined}
                onChange={setExpiresAt}
                placeholder="End date"
              />
            </div>
            <div className="flex items-end">
              <Button
                className="w-full"
                onClick={handleCreate}
                disabled={!memberId || !bookId || !reservedAt || !expiresAt || createMut.isPending}
              >
                Create reservation
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <p className="p-6 text-sm text-slate-500">Loading reservations...</p>
          ) : data?.reservations.length === 0 ? (
            <p className="p-6 text-sm text-slate-500">No reservations.</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {data?.reservations.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setSelectedReservation(r)}
                  className={cn(
                    'flex w-full flex-col gap-3 p-4 text-left transition-colors hover:bg-[var(--color-primary-soft)]/70',
                    'sm:flex-row sm:items-center sm:justify-between',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--color-primary)]/35'
                  )}
                >
                  <div className="min-w-0">
                    <p className="font-medium text-slate-900">
                      {r.bookTitle || 'Untitled book'}
                    </p>
                    <p className="text-sm text-slate-500">
                      {r.memberName || 'Unknown member'} · #{r.queuePosition} ·{' '}
                      {statusLabel(r.status)}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-400">
                      {formatDate(r.reservedAt)} → {formatDate(r.expiresAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 self-end sm:self-center">
                    <span
                      className={cn(
                        'rounded-full px-2.5 py-1 text-xs font-medium capitalize',
                        r.status === 'ready' && 'bg-emerald-50 text-emerald-700',
                        r.status === 'pending' && 'bg-amber-50 text-amber-700',
                        r.status === 'fulfilled' && 'bg-slate-100 text-slate-600',
                        r.status === 'cancelled' && 'bg-rose-50 text-rose-700',
                        r.status === 'expired' && 'bg-slate-100 text-slate-500'
                      )}
                    >
                      {statusLabel(r.status)}
                    </span>
                    <ChevronRight className="h-4 w-4 text-slate-400" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={Boolean(openReservation)}
        onClose={() => setSelectedReservation(null)}
        title="Reservation details"
        description="Hold queue record for this title and member"
      >
        {openReservation && (
          <div className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-2">
              <DetailField label="Book">
                <Link
                  to={`/books/${openReservation.bookId}`}
                  className="font-medium text-[var(--color-primary)] hover:underline"
                  onClick={() => setSelectedReservation(null)}
                >
                  {openReservation.bookTitle || 'Untitled book'}
                </Link>
              </DetailField>
              <DetailField label="Member">
                <Link
                  to={`/members/${openReservation.memberId}`}
                  className="font-medium text-[var(--color-primary)] hover:underline"
                  onClick={() => setSelectedReservation(null)}
                >
                  {openReservation.memberName || 'Unknown member'}
                </Link>
              </DetailField>
              <DetailField label="Status">
                <span className="capitalize">{statusLabel(openReservation.status)}</span>
              </DetailField>
              <DetailField label="Queue position">
                {openReservation.queuePosition != null ? `#${openReservation.queuePosition}` : '—'}
              </DetailField>
              <DetailField label="From">{formatDate(openReservation.reservedAt)}</DetailField>
              <DetailField label="To">{formatDate(openReservation.expiresAt)}</DetailField>
              <DetailField label="Reserved at">{formatDateTime(openReservation.reservedAt)}</DetailField>
              <DetailField label="Ready at">{formatDateTime(openReservation.readyAt)}</DetailField>
              <DetailField label="Expires at">{formatDateTime(openReservation.expiresAt)}</DetailField>
              <DetailField label="Fulfilled at">{formatDateTime(openReservation.fulfilledAt)}</DetailField>
              <DetailField label="Cancelled at">{formatDateTime(openReservation.cancelledAt)}</DetailField>
              <DetailField label="Cancel reason">
                {openReservation.cancelReason || '—'}
              </DetailField>
              <DetailField label="Copy ID">
                <span className="font-mono text-xs">{openReservation.copyId || '—'}</span>
              </DetailField>
              <DetailField label="Reservation ID">
                <span className="font-mono text-xs">{openReservation.id}</span>
              </DetailField>
            </div>

            <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-4">
              <Button variant="outline" onClick={() => setSelectedReservation(null)}>
                Close
              </Button>
              {canFulfill && openReservation.status === 'ready' && (
                <Button
                  onClick={() => fulfillMut.mutate(openReservation.id)}
                  disabled={fulfillMut.isPending}
                >
                  {fulfillMut.isPending ? 'Fulfilling...' : 'Fulfill'}
                </Button>
              )}
              {canCancel && ['pending', 'ready'].includes(openReservation.status) && (
                <Button
                  variant="secondary"
                  onClick={() => cancelMut.mutate(openReservation.id)}
                  disabled={cancelMut.isPending}
                >
                  {cancelMut.isPending ? 'Cancelling...' : 'Cancel hold'}
                </Button>
              )}
            </div>
          </div>
        )}
      </Dialog>
    </div>
  )
}

function DetailField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <div className="mt-0.5 text-sm text-slate-800">{children}</div>
    </div>
  )
}
