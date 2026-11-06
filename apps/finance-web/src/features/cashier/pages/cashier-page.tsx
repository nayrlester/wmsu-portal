import { useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { PageHeader } from '@/components/ui/page-chrome'
import { Spinner } from '@/components/ui/spinner'
import { getApiErrorMessage } from '@/lib/api-client'
import { formatCurrency } from '@/lib/utils'
import { apiClient } from '@/lib/api-client'
import { fetchDailyCollection, fetchStudentAccount, recordCashierPayment } from '../api/cashier-api'

type CollectionRow = {
  id?: string
  studentNumber?: string
  amount?: number
  paymentType?: string
  orNumber?: string | null
  particulars?: string | null
  assessmentNumber?: string | null
  reference?: string | null
  paidAt?: string
}

type DailyCollection = {
  businessDate?: string
  total?: number
  count?: number
  rows?: CollectionRow[]
}

type StudentAccount = {
  studentNumber?: string
  openBalance?: number
  openItems?: Array<Record<string, unknown>>
  assessments?: Array<Record<string, unknown>>
  payments?: Array<Record<string, unknown>>
  minimumDueRequired?: number | null
  installmentSchedule?: Array<{
    sequence?: number
    label?: string
    amount?: number
    paidAmount?: number
    status?: string
  }>
}

function collectionTime(value?: string) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' })
}

function collectionLabel(value?: string | null) {
  const text = String(value ?? '').trim()
  if (!text) return '—'
  return text
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function rowStr(row: Record<string, unknown>, camel: string): string {
  const snake = camel.replace(/([A-Z])/g, '_$1').toLowerCase()
  const v = row[camel] ?? row[snake]
  return v == null ? '' : String(v)
}

export function CashierPage() {
  const [studentNumber, setStudentNumber] = useState('')
  const [lookupDraft, setLookupDraft] = useState('')
  const [lookup, setLookup] = useState('')
  const [amount, setAmount] = useState('')
  const [assessmentNumber, setAssessmentNumber] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [lastOr, setLastOr] = useState<string | null>(null)
  const [lastOrId, setLastOrId] = useState<string | null>(null)

  const dailyQuery = useQuery({
    queryKey: ['cashier-daily'],
    queryFn: () => fetchDailyCollection(),
  })

  const accountQuery = useQuery({
    queryKey: ['cashier-account', lookup],
    queryFn: () => fetchStudentAccount(lookup.trim()),
    enabled: lookup.trim().length > 0,
    retry: false,
  })

  const account = accountQuery.data as StudentAccount | undefined
  const daily = dailyQuery.data as DailyCollection | undefined
  const collections = daily?.rows ?? []

  const payMutation = useMutation({
    mutationFn: () =>
      recordCashierPayment({
        studentNumber,
        amount: Number(amount),
        assessmentNumber: assessmentNumber || undefined,
        reference: `WEB-${Date.now()}`,
        particulars: 'UFMS cashier web',
      }),
    onSuccess: (data) => {
      setError(null)
      const receipt = data?.receipt as { or_number?: string; id?: string } | undefined
      setLastOr(receipt?.or_number ?? null)
      setLastOrId(receipt?.id ?? null)
      setLookupDraft(studentNumber)
      setLookup(studentNumber.trim())
      dailyQuery.refetch()
    },
    onError: (err) => setError(getApiErrorMessage(err)),
  })

  const runLookup = () => {
    const next = lookupDraft.trim()
    if (!next) {
      setError('Enter a student number to search.')
      return
    }
    setError(null)
    setLookup(next)
  }

  const openItems = (account?.openItems ?? []).filter((item) => rowStr(item, 'status') !== 'closed')
  const payments = account?.payments ?? []

  return (
    <div className="space-y-8">
      <PageHeader
        title="Cashier & Accounts Receivable"
        description="Controlled OR issuance, student AR inquiry, and daily collection monitoring."
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
          <h2 className="text-lg font-semibold text-[var(--color-foreground)]">Record payment</h2>
          <div className="mt-4 grid gap-3">
            <Input
              placeholder="Student number"
              value={studentNumber}
              onChange={(e) => setStudentNumber(e.target.value)}
            />
            <Input
              placeholder="Assessment number (optional)"
              value={assessmentNumber}
              onChange={(e) => setAssessmentNumber(e.target.value)}
            />
            <Input
              placeholder="Amount"
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
            {error ? <p className="text-sm text-red-600">{error}</p> : null}
            {lastOr ? <p className="text-sm text-emerald-700">Official Receipt: {lastOr}</p> : null}
            {lastOrId ? (
              <Button
                type="button"
                variant="secondary"
                onClick={async () => {
                  const { data } = await apiClient.get(`/official/receipts/${lastOrId}`, {
                    params: { format: 'html' },
                    responseType: 'blob',
                  })
                  const url = URL.createObjectURL(
                    data instanceof Blob ? data : new Blob([data], { type: 'text/html' })
                  )
                  window.open(url, '_blank')
                }}
              >
                Print OR
              </Button>
            ) : null}
            <Button
              disabled={payMutation.isPending || !studentNumber || !amount}
              onClick={() => payMutation.mutate()}
            >
              {payMutation.isPending ? <Spinner className="h-4 w-4" /> : 'Post payment'}
            </Button>
          </div>
        </section>

        <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
          <h2 className="text-lg font-semibold text-[var(--color-foreground)]">
            Student AR lookup
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            Try a known demo student number such as{' '}
            <span className="font-mono">2026-PH-NEW001</span> or{' '}
            <span className="font-mono">2026-00001</span>.
          </p>
          <div className="mt-4 flex gap-2">
            <Input
              placeholder="Student number"
              value={lookupDraft}
              onChange={(e) => setLookupDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  runLookup()
                }
              }}
            />
            <Button
              type="button"
              variant="secondary"
              disabled={accountQuery.isFetching}
              onClick={runLookup}
            >
              {accountQuery.isFetching ? <Spinner className="h-4 w-4" /> : 'Search'}
            </Button>
          </div>

          {accountQuery.isError ? (
            <p className="mt-4 text-sm text-red-600" role="alert">
              {getApiErrorMessage(accountQuery.error, 'Student AR lookup failed.')}
            </p>
          ) : null}

          {accountQuery.isFetching && !account ? <Spinner className="mt-4 h-5 w-5" /> : null}

          {account && !accountQuery.isFetching ? (
            <div className="mt-4 space-y-4 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-mono font-medium">{account.studentNumber ?? lookup}</p>
                <Badge variant={Number(account.openBalance ?? 0) > 0 ? 'warning' : 'success'}>
                  {Number(account.openBalance ?? 0) > 0 ? 'Balance due' : 'Cleared'}
                </Badge>
              </div>
              <div className="grid gap-2 sm:grid-cols-3">
                <div className="rounded-xl border bg-white p-3">
                  <p className="text-xs uppercase text-slate-500">Open balance</p>
                  <p className="font-semibold">
                    {formatCurrency(Number(account.openBalance ?? 0))}
                  </p>
                </div>
                <div className="rounded-xl border bg-white p-3">
                  <p className="text-xs uppercase text-slate-500">Open items</p>
                  <p className="font-semibold">{openItems.length}</p>
                </div>
                <div className="rounded-xl border bg-white p-3">
                  <p className="text-xs uppercase text-slate-500">Payments</p>
                  <p className="font-semibold">{payments.length}</p>
                </div>
              </div>

              {account.minimumDueRequired != null ? (
                <p className="text-sm">
                  Minimum due for registration:{' '}
                  <span className="font-semibold">
                    {formatCurrency(Number(account.minimumDueRequired))}
                  </span>
                </p>
              ) : null}

              {(account.installmentSchedule ?? []).length > 0 ? (
                <div className="overflow-x-auto rounded-xl border">
                  <table className="min-w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-600">
                      <tr>
                        <th className="px-3 py-2">Installment</th>
                        <th className="px-3 py-2">Amount</th>
                        <th className="px-3 py-2">Paid</th>
                        <th className="px-3 py-2">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(account.installmentSchedule ?? []).map((row) => (
                        <tr key={String(row.sequence ?? row.label)} className="border-t">
                          <td className="px-3 py-2">{String(row.label ?? '')}</td>
                          <td className="px-3 py-2">{formatCurrency(Number(row.amount ?? 0))}</td>
                          <td className="px-3 py-2">
                            {formatCurrency(Number(row.paidAmount ?? 0))}
                          </td>
                          <td className="px-3 py-2">{String(row.status ?? '')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : null}

              {openItems.length === 0 && payments.length === 0 ? (
                <p className="rounded-xl border border-dashed px-3 py-4 text-slate-500">
                  No AR open items or payments found for this student number.
                </p>
              ) : null}

              {openItems.length > 0 ? (
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Open items
                  </p>
                  <ul className="space-y-1">
                    {openItems.slice(0, 8).map((item) => (
                      <li
                        key={
                          rowStr(item, 'id') ||
                          `${rowStr(item, 'assessmentId')}-${rowStr(item, 'openAmount')}`
                        }
                        className="flex justify-between gap-2 rounded-lg bg-slate-50 px-3 py-2"
                      >
                        <span className="truncate">
                          {rowStr(item, 'description') ||
                            rowStr(item, 'assessmentId') ||
                            rowStr(item, 'assessment_id') ||
                            'AR item'}
                        </span>
                        <span className="font-medium">
                          {formatCurrency(Number(item.openAmount ?? item.open_amount ?? 0))}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {payments.length > 0 ? (
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Recent payments
                  </p>
                  <ul className="space-y-1">
                    {payments.slice(0, 8).map((payment) => (
                      <li
                        key={
                          rowStr(payment, 'id') ||
                          `${rowStr(payment, 'orNumber')}-${rowStr(payment, 'paidAt')}`
                        }
                        className="flex justify-between gap-2 rounded-lg bg-slate-50 px-3 py-2"
                      >
                        <span className="truncate">
                          {rowStr(payment, 'orNumber') ||
                            rowStr(payment, 'or_number') ||
                            rowStr(payment, 'reference') ||
                            'Payment'}{' '}
                          <span className="text-slate-400">
                            {(rowStr(payment, 'paidAt') || rowStr(payment, 'paid_at')).slice(0, 10)}
                          </span>
                        </span>
                        <span className="font-medium">
                          {formatCurrency(Number(payment.amount ?? 0))}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          ) : null}
        </section>
      </div>

      <section
        className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6"
        data-testid="daily-collection"
      >
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 className="text-lg font-semibold text-[var(--color-foreground)]">Daily collection</h2>
          {daily ? (
            <p className="text-sm text-slate-500">{daily.businessDate}</p>
          ) : null}
        </div>
        {dailyQuery.isLoading ? <Spinner className="mt-4 h-5 w-5" /> : null}
        {dailyQuery.isError ? (
          <p className="mt-4 text-sm text-red-600" role="alert">
            {getApiErrorMessage(dailyQuery.error, 'Daily collection could not be loaded.')}
          </p>
        ) : null}
        {daily ? (
          <div className="mt-4 space-y-4">
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="rounded-xl border bg-white p-3">
                <p className="text-xs uppercase text-slate-500">Total collected</p>
                <p className="font-semibold">{formatCurrency(Number(daily.total ?? 0))}</p>
              </div>
              <div className="rounded-xl border bg-white p-3">
                <p className="text-xs uppercase text-slate-500">Transactions</p>
                <p className="font-semibold">{daily.count ?? collections.length}</p>
              </div>
            </div>
            {collections.length > 0 ? (
              <div className="overflow-x-auto rounded-xl border">
                <table className="min-w-full text-left text-xs" data-testid="daily-collection-list">
                  <thead className="bg-slate-50 text-slate-600">
                    <tr>
                      <th className="whitespace-nowrap px-3 py-2">Time</th>
                      <th className="whitespace-nowrap px-3 py-2">OR</th>
                      <th className="whitespace-nowrap px-3 py-2">Student</th>
                      <th className="whitespace-nowrap px-3 py-2">Type</th>
                      <th className="whitespace-nowrap px-3 py-2">Particulars</th>
                      <th className="whitespace-nowrap px-3 py-2 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {collections.map((row) => (
                      <tr
                        key={row.id ?? `${row.orNumber}-${row.studentNumber}-${row.paidAt}`}
                        className="border-t"
                      >
                        <td className="whitespace-nowrap px-3 py-2">{collectionTime(row.paidAt)}</td>
                        <td className="whitespace-nowrap px-3 py-2 font-mono">
                          {row.orNumber || '—'}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 font-mono">
                          {row.studentNumber || '—'}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2">
                          {collectionLabel(row.paymentType)}
                        </td>
                        <td className="max-w-[16rem] truncate px-3 py-2">
                          {row.particulars || row.assessmentNumber || row.reference || '—'}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 text-right font-medium">
                          {formatCurrency(Number(row.amount ?? 0))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="rounded-xl border border-dashed px-3 py-4 text-sm text-slate-500">
                No collections for this date.
              </p>
            )}
          </div>
        ) : null}
      </section>
    </div>
  )
}
