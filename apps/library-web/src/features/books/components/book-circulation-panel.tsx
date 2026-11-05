import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeftRight, Bookmark } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  SearchableSelect,
  type SearchableSelectOption,
} from '@/components/ui/searchable-select'
import { Label } from '@/components/ui/label'
import { DatePicker } from '@/components/ui/date-picker'
import { useMembers } from '@/hooks/use-members'
import { useDirectCheckout } from '@/hooks/use-borrowings'
import { bookKeys } from '@/hooks/use-books'
import { createReservation } from '@/lib/reservations-api'
import { useAuthStore } from '@/stores/auth-store'
import { useDialog } from '@/components/providers/dialog-provider'
import type { Book, BookCopy } from '@/types/books'

const DEFAULT_LOAN_DAYS = 14

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

interface BookCirculationPanelProps {
  book: Book
}

export function BookCirculationPanel({ book }: BookCirculationPanelProps) {
  const user = useAuthStore((s) => s.user)
  const { toast } = useDialog()
  const qc = useQueryClient()

  const canCheckout = user?.permissions.includes('borrowings:checkout')
  const canReserve = user?.permissions.includes('reservations:create')

  const [memberId, setMemberId] = useState('')
  const [memberSearch, setMemberSearch] = useState('')
  const [selectedMember, setSelectedMember] = useState<SearchableSelectOption | null>(null)
  const [copyId, setCopyId] = useState('')
  const [borrowedAt, setBorrowedAt] = useState(() => toDateInputValue(new Date()))
  const [dueAt, setDueAt] = useState(() =>
    toDateInputValue(addDays(new Date(), DEFAULT_LOAN_DAYS))
  )

  const debouncedMemberSearch = useDebouncedValue(memberSearch)
  const { data: membersData, isFetching: membersLoading } = useMembers({
    search: debouncedMemberSearch || undefined,
    membershipStatus: 'approved',
    perPage: 25,
  })

  const availableCopies = useMemo(
    () => (book.copies ?? []).filter((copy) => copy.status === 'available'),
    [book.copies]
  )

  useEffect(() => {
    if (!copyId && availableCopies[0]) {
      setCopyId(availableCopies[0].id)
      return
    }
    if (copyId && !availableCopies.some((copy) => copy.id === copyId)) {
      setCopyId(availableCopies[0]?.id ?? '')
    }
  }, [availableCopies, copyId])

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

  const directCheckout = useDirectCheckout()

  const reserveMut = useMutation({
    mutationFn: () => createReservation({ memberId, bookId: book.id }),
    onSuccess: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: bookKeys.detail(book.id) }),
        qc.invalidateQueries({ queryKey: ['reservations'] }),
      ])
      resetMember()
      toast.success('Hold placed')
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Failed to place hold'),
  })

  if (!canCheckout && !canReserve) return null

  function resetMember() {
    setMemberId('')
    setMemberSearch('')
    setSelectedMember(null)
  }

  function resetLoanDates() {
    const today = new Date()
    setBorrowedAt(toDateInputValue(today))
    setDueAt(toDateInputValue(addDays(today, DEFAULT_LOAN_DAYS)))
  }

  function handleMemberChange(nextId: string) {
    setMemberId(nextId)
    setSelectedMember(memberOptions.find((option) => option.value === nextId) ?? null)
  }

  function handleBorrowedAtChange(value: string) {
    setBorrowedAt(value)
    if (!value) return
    const start = new Date(`${value}T00:00:00`)
    if (Number.isNaN(start.getTime())) return
    const currentDue = dueAt ? new Date(`${dueAt}T00:00:00`) : null
    if (!currentDue || Number.isNaN(currentDue.getTime()) || currentDue <= start) {
      setDueAt(toDateInputValue(addDays(start, DEFAULT_LOAN_DAYS)))
    }
  }

  async function handleCheckout() {
    if (!memberId || !copyId) {
      toast.error('Select a member and an available copy')
      return
    }
    if (!borrowedAt || !dueAt) {
      toast.error('Select borrow start and due dates')
      return
    }
    if (dueAt <= borrowedAt) {
      toast.error('Due date must be after the start date')
      return
    }
    try {
      await directCheckout.mutateAsync({ memberId, copyId, borrowedAt, dueAt })
      await qc.invalidateQueries({ queryKey: bookKeys.detail(book.id) })
      resetMember()
      resetLoanDates()
      toast.success('Book checked out')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Checkout failed')
    }
  }

  function copyLabel(copy: BookCopy) {
    return `Copy #${copy.copyNumber}${copy.shelfLocation ? ` · ${copy.shelfLocation}` : ''} · ${copy.barcode}`
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Lend or hold</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1.5">
          <Label>Member</Label>
          <SearchableSelect
            options={memberOptions}
            value={memberId}
            onChange={handleMemberChange}
            onSearchChange={setMemberSearch}
            placeholder="Search member by name or card..."
            emptyMessage="No approved members found"
            isLoading={membersLoading}
          />
        </div>

        {canCheckout && (
          <>
            <div className="space-y-1.5">
              <Label>Available copy</Label>
              {availableCopies.length === 0 ? (
                <p className="rounded-full bg-[var(--color-primary-soft)] px-4 py-2.5 text-sm text-slate-500">
                  No available copies — place a hold instead
                </p>
              ) : (
                <select
                  value={copyId}
                  onChange={(e) => setCopyId(e.target.value)}
                  className="flex h-11 w-full rounded-full border border-transparent bg-[var(--color-primary-soft)] px-4 text-sm text-[var(--color-ink)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/35"
                >
                  {availableCopies.map((copy) => (
                    <option key={copy.id} value={copy.id}>
                      {copyLabel(copy)}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="borrow-from">From</Label>
                <DatePicker
                  id="borrow-from"
                  value={borrowedAt}
                  onChange={handleBorrowedAtChange}
                  placeholder="Start date"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="borrow-to">To (due)</Label>
                <DatePicker
                  id="borrow-to"
                  value={dueAt}
                  min={borrowedAt || undefined}
                  onChange={setDueAt}
                  placeholder="Due date"
                />
              </div>
            </div>
          </>
        )}

        <div className="flex flex-col gap-2">
          {canCheckout && (
            <Button
              onClick={() => {
                void handleCheckout()
              }}
              disabled={!memberId || !copyId || availableCopies.length === 0 || directCheckout.isPending}
            >
              <ArrowLeftRight className="mr-2 h-4 w-4" />
              {directCheckout.isPending ? 'Checking out...' : 'Check out'}
            </Button>
          )}
          {canReserve && (
            <Button
              variant="outline"
              onClick={() => reserveMut.mutate()}
              disabled={!memberId || reserveMut.isPending}
            >
              <Bookmark className="mr-2 h-4 w-4" />
              {reserveMut.isPending ? 'Placing hold...' : 'Place hold'}
            </Button>
          )}
        </div>

        <p className="text-xs text-slate-500">
          From/To set the loan period (default {DEFAULT_LOAN_DAYS} days). Place hold adds the member
          to the reservation queue for this title.
        </p>
      </CardContent>
    </Card>
  )
}
