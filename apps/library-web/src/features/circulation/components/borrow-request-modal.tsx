import { useEffect, useMemo, useState } from 'react'
import { Dialog } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { DatePicker } from '@/components/ui/date-picker'
import {
  SearchableSelect,
  type SearchableSelectOption,
} from '@/components/ui/searchable-select'
import { BorrowingStatusBadge } from '@/components/circulation/borrowing-status-badge'
import { useMembers } from '@/hooks/use-members'
import { useBooks } from '@/hooks/use-books'
import { useBorrowings, useRequestBorrow } from '@/hooks/use-borrowings'
import { useCirculationStore } from '@/stores/circulation-store'

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

export function BorrowRequestModal() {
  const { showRequestModal, closeRequestModal } = useCirculationStore()
  const [memberId, setMemberId] = useState('')
  const [bookId, setBookId] = useState('')
  const [memberSearch, setMemberSearch] = useState('')
  const [bookSearch, setBookSearch] = useState('')
  const [selectedMember, setSelectedMember] = useState<SearchableSelectOption | null>(null)
  const [selectedBook, setSelectedBook] = useState<SearchableSelectOption | null>(null)
  const [borrowedAt, setBorrowedAt] = useState(() => toDateInputValue(new Date()))
  const [dueAt, setDueAt] = useState(() =>
    toDateInputValue(addDays(new Date(), DEFAULT_LOAN_DAYS))
  )
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<string | null>(null)

  const debouncedMemberSearch = useDebouncedValue(memberSearch)
  const debouncedBookSearch = useDebouncedValue(bookSearch)

  const { data: membersData, isFetching: membersLoading } = useMembers({
    search: debouncedMemberSearch || undefined,
    membershipStatus: 'approved',
    perPage: 25,
  })
  const { data: booksData, isFetching: booksLoading } = useBooks({
    search: debouncedBookSearch || undefined,
    perPage: 25,
  })
  const { data: memberLoans, isFetching: loansLoading } = useBorrowings({
    memberId: memberId || undefined,
    perPage: 50,
  })
  const requestBorrow = useRequestBorrow()

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

  const activeLoans = useMemo(
    () =>
      (memberLoans?.borrowings ?? []).filter((loan) =>
        ['borrowed', 'overdue', 'approved', 'requested'].includes(loan.status)
      ),
    [memberLoans?.borrowings]
  )

  function resetForm() {
    setMemberId('')
    setBookId('')
    setMemberSearch('')
    setBookSearch('')
    setSelectedMember(null)
    setSelectedBook(null)
    setNotes('')
    setError(null)
    const today = new Date()
    setBorrowedAt(toDateInputValue(today))
    setDueAt(toDateInputValue(addDays(today, DEFAULT_LOAN_DAYS)))
  }

  function handleClose() {
    resetForm()
    closeRequestModal()
  }

  function handleMemberChange(nextId: string) {
    setMemberId(nextId)
    setSelectedMember(memberOptions.find((option) => option.value === nextId) ?? null)
  }

  function handleBookChange(nextId: string) {
    setBookId(nextId)
    setSelectedBook(bookOptions.find((option) => option.value === nextId) ?? null)
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!memberId || !bookId) {
      setError('Select a member and book')
      return
    }
    if (!borrowedAt || !dueAt) {
      setError('Select From and To dates')
      return
    }
    if (dueAt <= borrowedAt) {
      setError('To date must be after From date')
      return
    }

    try {
      await requestBorrow.mutateAsync({
        memberId,
        bookId,
        notes: notes || undefined,
        borrowedAt,
        dueAt,
      })
      resetForm()
      closeRequestModal()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit request')
    }
  }

  return (
    <Dialog
      open={showRequestModal}
      onClose={handleClose}
      title="New borrow request"
      description="Submit a request for a member to borrow a book"
      className="max-w-3xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
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

        {memberId && (
          <div className="rounded-2xl border border-slate-100 bg-[var(--color-primary-soft)]/50 p-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
              Member borrowings
            </p>
            {loansLoading ? (
              <p className="text-sm text-slate-500">Loading borrowings...</p>
            ) : activeLoans.length === 0 ? (
              <p className="text-sm text-slate-500">No active or pending borrowings for this member.</p>
            ) : (
              <div className="max-h-44 space-y-2 overflow-y-auto">
                {activeLoans.map((loan) => (
                  <div
                    key={loan.id}
                    className="rounded-xl bg-white px-3 py-2.5 shadow-sm ring-1 ring-slate-100"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-medium text-slate-900">
                        {loan.bookTitle || 'Untitled book'}
                      </p>
                      <BorrowingStatusBadge status={loan.status} />
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      {loan.transactionNumber}
                      {loan.copyBarcode ? ` · ${loan.copyBarcode}` : ''}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-400">
                      From {formatDate(loan.borrowedAt)} → To {formatDate(loan.dueAt)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="space-y-1.5">
          <Label>Book</Label>
          <SearchableSelect
            options={bookOptions}
            value={bookId}
            onChange={handleBookChange}
            onSearchChange={setBookSearch}
            placeholder="Search book by title or ISBN..."
            emptyMessage="No books found"
            isLoading={booksLoading}
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>From</Label>
            <DatePicker
              value={borrowedAt}
              onChange={handleBorrowedAtChange}
              placeholder="Start date"
            />
          </div>
          <div className="space-y-1.5">
            <Label>To (due)</Label>
            <DatePicker
              value={dueAt}
              min={borrowedAt || undefined}
              onChange={setDueAt}
              placeholder="Due date"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="notes">Notes (optional)</Label>
          <Input
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Special instructions..."
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={requestBorrow.isPending}>
            {requestBorrow.isPending ? 'Submitting...' : 'Submit request'}
          </Button>
        </div>
      </form>
    </Dialog>
  )
}
