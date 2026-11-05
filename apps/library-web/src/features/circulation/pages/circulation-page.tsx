import { useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import {
  Plus,
  Search,
  CheckCircle,
  PackageCheck,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog } from '@/components/ui/dialog'
import { BorrowingStatusBadge } from '@/components/circulation/borrowing-status-badge'
import { BorrowRequestModal } from '@/features/circulation/components/borrow-request-modal'
import { ReturnProcessingPanel } from '@/features/circulation/components/return-processing-panel'
import { FinesSummaryPanel } from '@/features/circulation/components/fines-summary-panel'
import {
  useBorrowingDashboard,
  useBorrowings,
  useApproveBorrowing,
  useCheckoutBorrowing,
  useRenewBorrowing,
} from '@/hooks/use-borrowings'
import { useCirculationStore } from '@/stores/circulation-store'
import { useAuthStore } from '@/stores/auth-store'
import type { Borrowing, BorrowingStatus } from '@/types/borrowings'
import { cn } from '@/lib/utils'

const STATUS_TABS: Array<{ value: BorrowingStatus | 'all'; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'requested', label: 'Requested' },
  { value: 'approved', label: 'Approved' },
  { value: 'borrowed', label: 'Borrowed' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'returned', label: 'Returned' },
]

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

function formatDateTime(value: string | null | undefined) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleString()
}

export function CirculationPage() {
  const user = useAuthStore((s) => s.user)
  const {
    search,
    page,
    perPage,
    statusFilter,
    setSearch,
    setPage,
    setStatusFilter,
    openRequestModal,
    openReturnPanel,
  } = useCirculationStore()

  const [localSearch, setLocalSearch] = useState(search)
  const [selectedBorrowing, setSelectedBorrowing] = useState<Borrowing | null>(null)

  const canRequest = user?.permissions.includes('borrowings:request')
  const canApprove = user?.permissions.includes('borrowings:approve')
  const canCheckout = user?.permissions.includes('borrowings:checkout')
  const canReturn = user?.permissions.includes('borrowings:return')
  const canRenew = user?.permissions.includes('borrowings:renew')
  const canReadFines = user?.permissions.includes('fines:read')

  const { data: dashboard } = useBorrowingDashboard()
  const { data, isLoading } = useBorrowings({
    search,
    page,
    perPage,
    status: statusFilter === 'all' ? undefined : statusFilter,
  })

  const approveBorrow = useApproveBorrowing()
  const checkoutBorrow = useCheckoutBorrowing()
  const renewBorrow = useRenewBorrowing()

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    setSearch(localSearch)
  }

  const openBorrowing =
    selectedBorrowing &&
    (data?.borrowings.find((item) => item.id === selectedBorrowing.id) ?? selectedBorrowing)

  function closeDetails() {
    setSelectedBorrowing(null)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Circulation</h1>
          <p className="text-sm text-slate-500">
            Desk checkout, returns, renewals, and holds (LIB-005 / LIB-006 / LIB-020)
          </p>
        </div>
        {canRequest && (
          <Button onClick={openRequestModal}>
            <Plus className="mr-2 h-4 w-4" />
            New request
          </Button>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5" data-testid="circulation-dashboard">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Active loans</p>
            <p className="mt-1 text-2xl font-semibold">{dashboard?.activeLoans ?? '—'}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-indigo-600">Due today</p>
            <p className="mt-1 text-2xl font-semibold text-indigo-700">
              {dashboard?.dueTodayCount ?? '—'}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-red-600">Overdue</p>
            <p className="mt-1 text-2xl font-semibold text-red-700">
              {dashboard?.overdueCount ?? '—'}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-amber-600">Pending</p>
            <p className="mt-1 text-2xl font-semibold">{dashboard?.pendingRequests ?? '—'}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-blue-600">
              Ready checkout
            </p>
            <p className="mt-1 text-2xl font-semibold">{dashboard?.readyForCheckout ?? '—'}</p>
          </CardContent>
        </Card>
      </div>
      {dashboard?.loanRules?.policyNote && (
        <p className="text-xs text-slate-500" data-testid="circulation-policy-note">
          {dashboard.loanRules.policyNote} · Loan period {dashboard.loanRules.loanPeriodDays}d · Max
          renewals {dashboard.loanRules.maxRenewals} · Max active{' '}
          {dashboard.loanRules.maxActiveBorrowings}
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <div className="flex flex-wrap gap-2">
            {STATUS_TABS.map((tab) => (
              <button
                key={tab.value}
                type="button"
                onClick={() => setStatusFilter(tab.value)}
                className={`rounded-full px-3 py-1 text-sm font-medium transition-colors ${
                  statusFilter === tab.value
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={localSearch}
                onChange={(e) => setLocalSearch(e.target.value)}
                placeholder="Search by member, book, or transaction..."
                className="pl-9"
              />
            </div>
            <Button type="submit" variant="outline">
              Search
            </Button>
          </form>

          <Card>
            <CardContent className="p-0">
              {isLoading ? (
                <p className="p-6 text-sm text-slate-500">Loading borrowings...</p>
              ) : data?.borrowings.length === 0 ? (
                <p className="p-6 text-sm text-slate-500">No borrowings found.</p>
              ) : (
                <div className="divide-y divide-slate-100">
                  {data?.borrowings.map((b) => (
                    <div
                      key={b.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => setSelectedBorrowing(b)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          setSelectedBorrowing(b)
                        }
                      }}
                      className={cn(
                        'flex cursor-pointer flex-col gap-3 p-4 transition-colors hover:bg-[var(--color-primary-soft)]/70',
                        'sm:flex-row sm:items-center sm:justify-between',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--color-primary)]/35'
                      )}
                    >
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-medium text-slate-900">{b.bookTitle}</p>
                          <BorrowingStatusBadge status={b.status} />
                        </div>
                        <p className="mt-1 text-sm text-slate-500">
                          {b.memberName} · {b.transactionNumber}
                        </p>
                        {(b.borrowedAt || b.dueAt) && (
                          <p className="text-xs text-slate-400">
                            From {formatDate(b.borrowedAt)} → To {formatDate(b.dueAt)}
                          </p>
                        )}
                      </div>

                      <div
                        className="flex shrink-0 flex-wrap items-center gap-2"
                        onClick={(e) => e.stopPropagation()}
                        onKeyDown={(e) => e.stopPropagation()}
                      >
                        {canApprove && b.status === 'requested' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => approveBorrow.mutate({ id: b.id })}
                            disabled={approveBorrow.isPending}
                          >
                            <CheckCircle className="mr-1 h-3 w-3" />
                            Approve
                          </Button>
                        )}
                        {canCheckout && b.status === 'approved' && (
                          <Button
                            size="sm"
                            onClick={() => checkoutBorrow.mutate(b.id)}
                            disabled={checkoutBorrow.isPending}
                          >
                            <PackageCheck className="mr-1 h-3 w-3" />
                            Checkout
                          </Button>
                        )}
                        {canRenew && b.status === 'borrowed' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => renewBorrow.mutate(b.id)}
                            disabled={renewBorrow.isPending}
                          >
                            Renew
                          </Button>
                        )}
                        {canReturn && ['borrowed', 'overdue'].includes(b.status) && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openReturnPanel(b.id)}
                          >
                            <RotateCcw className="mr-1 h-3 w-3" />
                            Return
                          </Button>
                        )}
                        <ChevronRight className="h-4 w-4 text-slate-400" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {data && data.meta.totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-500">
                Page {data.meta.page} of {data.meta.totalPages} ({data.meta.total} total)
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= data.meta.totalPages}
                  onClick={() => setPage(page + 1)}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>

        {canReadFines && (
          <div>
            <FinesSummaryPanel />
          </div>
        )}
      </div>

      <Dialog
        open={Boolean(openBorrowing)}
        onClose={closeDetails}
        title="Borrowing details"
        description="Loan / request record for this title and member"
        className="max-w-2xl"
      >
        {openBorrowing && (
          <div className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-2">
              <DetailField label="Book">
                <Link
                  to={`/books/${openBorrowing.bookId}`}
                  className="font-medium text-[var(--color-primary)] hover:underline"
                  onClick={closeDetails}
                >
                  {openBorrowing.bookTitle || 'Untitled book'}
                </Link>
              </DetailField>
              <DetailField label="Member">
                <Link
                  to={`/members/${openBorrowing.memberId}`}
                  className="font-medium text-[var(--color-primary)] hover:underline"
                  onClick={closeDetails}
                >
                  {openBorrowing.memberName || 'Unknown member'}
                </Link>
              </DetailField>
              <DetailField label="Status">
                <BorrowingStatusBadge status={openBorrowing.status} />
              </DetailField>
              <DetailField label="Transaction">
                <span className="font-mono text-xs">{openBorrowing.transactionNumber}</span>
              </DetailField>
              <DetailField label="From">{formatDate(openBorrowing.borrowedAt)}</DetailField>
              <DetailField label="To (due)">{formatDate(openBorrowing.dueAt)}</DetailField>
              <DetailField label="Requested at">{formatDateTime(openBorrowing.requestedAt)}</DetailField>
              <DetailField label="Approved at">{formatDateTime(openBorrowing.approvedAt)}</DetailField>
              <DetailField label="Borrowed at">{formatDateTime(openBorrowing.borrowedAt)}</DetailField>
              <DetailField label="Returned at">{formatDateTime(openBorrowing.returnedAt)}</DetailField>
              <DetailField label="Copy barcode">
                {openBorrowing.copyBarcode || '—'}
              </DetailField>
              <DetailField label="Card number">
                {openBorrowing.memberCardNumber || '—'}
              </DetailField>
              <DetailField label="Renewals">
                {openBorrowing.renewalCount ?? 0}
                {openBorrowing.maxRenewals != null ? ` / ${openBorrowing.maxRenewals}` : ''}
              </DetailField>
              <DetailField label="Notes">{openBorrowing.notes || '—'}</DetailField>
            </div>

            <div
              className="flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-4"
              onClick={(e) => e.stopPropagation()}
            >
              <Button variant="outline" onClick={closeDetails}>
                Close
              </Button>
              {canApprove && openBorrowing.status === 'requested' && (
                <Button
                  variant="outline"
                  onClick={() => {
                    approveBorrow.mutate(
                      { id: openBorrowing.id },
                      { onSuccess: closeDetails }
                    )
                  }}
                  disabled={approveBorrow.isPending}
                >
                  Approve
                </Button>
              )}
              {canCheckout && openBorrowing.status === 'approved' && (
                <Button
                  onClick={() => {
                    checkoutBorrow.mutate(openBorrowing.id, { onSuccess: closeDetails })
                  }}
                  disabled={checkoutBorrow.isPending}
                >
                  Checkout
                </Button>
              )}
              {canRenew && openBorrowing.status === 'borrowed' && (
                <Button
                  variant="outline"
                  onClick={() => renewBorrow.mutate(openBorrowing.id)}
                  disabled={renewBorrow.isPending}
                >
                  Renew
                </Button>
              )}
              {canReturn && ['borrowed', 'overdue'].includes(openBorrowing.status) && (
                <Button
                  variant="secondary"
                  onClick={() => {
                    closeDetails()
                    openReturnPanel(openBorrowing.id)
                  }}
                >
                  Return
                </Button>
              )}
            </div>
          </div>
        )}
      </Dialog>

      <BorrowRequestModal />
      <ReturnProcessingPanel />
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
