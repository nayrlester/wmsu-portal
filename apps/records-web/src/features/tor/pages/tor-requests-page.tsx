import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { PageHeader, SectionCard, StatusBadge } from '@/components/ui/page-chrome'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Spinner } from '@/components/ui/spinner'
import { EmptyState } from '@/components/ui/empty-state'
import {
  listTorRequests,
  submitTorRequest,
  type TorRequest,
} from '../api/tor-api'

const PURPOSE_OPTIONS = [
  { value: 'employment', label: 'Employment' },
  { value: 'study', label: 'Study' },
  { value: 'migration', label: 'Migration' },
  { value: 'other', label: 'Other' },
]

const LOCALITY_OPTIONS = [
  { value: 'local', label: 'Local' },
  { value: 'foreign', label: 'Foreign / international' },
]

const STATUS_OPTIONS = [
  { value: 'pending', label: 'pending' },
  { value: 'processing', label: 'processing' },
  { value: 'approved', label: 'approved' },
  { value: 'released', label: 'released' },
]

export function TorRequestsPage() {
  const qc = useQueryClient()
  const [status, setStatus] = useState('')
  const [studentNumber, setStudentNumber] = useState('')
  const [form, setForm] = useState({
    studentNumber: '',
    purpose: 'employment',
    locality: 'local' as 'local' | 'foreign',
    destinationCountry: '',
    agency: '',
    copies: 1,
    isFirstRequestAfterGraduation: false,
  })
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitOk, setSubmitOk] = useState<string | null>(null)

  const query = useQuery({
    queryKey: ['tor-requests', status, studentNumber],
    queryFn: () =>
      listTorRequests({
        status: status || undefined,
        studentNumber: studentNumber || undefined,
      }),
  })

  const submit = useMutation({
    mutationFn: () =>
      submitTorRequest({
        studentNumber: form.studentNumber.trim(),
        purpose: form.purpose.trim(),
        locality: form.locality,
        destinationCountry: form.destinationCountry || undefined,
        agency: form.agency || undefined,
        copies: form.copies,
        isFirstRequestAfterGraduation: form.isFirstRequestAfterGraduation,
      }),
    onSuccess: (data) => {
      setSubmitError(null)
      setSubmitOk(data.request.request_number as string)
      qc.invalidateQueries({ queryKey: ['tor-requests'] })
    },
    onError: (err: unknown) => {
      setSubmitOk(null)
      const ax = err as { response?: { data?: { message?: string } } }
      setSubmitError(ax.response?.data?.message ?? 'Submission failed')
    },
  })

  const rows = useMemo(() => query.data ?? [], [query.data])

  return (
    <div className="space-y-6">
      <PageHeader
        title="Transcript Requests"
        description="Submit and track Transcript of Records requests. Academic grades are retrieved from USiS."
      />

      <SectionCard title="Submit request">
        <form
          className="grid gap-3 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault()
            submit.mutate()
          }}
        >
          <label className="text-sm">
            <span className="mb-1 block text-slate-600">Student number</span>
            <Input
              required
              value={form.studentNumber}
              onChange={(e) => setForm((f) => ({ ...f, studentNumber: e.target.value }))}
              placeholder="e.g. 2020-12345"
            />
          </label>
          <Select
            label="Purpose"
            options={PURPOSE_OPTIONS}
            value={form.purpose}
            onChange={(e) => setForm((f) => ({ ...f, purpose: e.target.value }))}
          />
          <Select
            label="Locality"
            options={LOCALITY_OPTIONS}
            value={form.locality}
            onChange={(e) =>
              setForm((f) => ({ ...f, locality: e.target.value as 'local' | 'foreign' }))
            }
          />
          <label className="text-sm">
            <span className="mb-1 block text-slate-600">Copies</span>
            <Input
              type="number"
              min={1}
              max={50}
              value={form.copies}
              onChange={(e) => setForm((f) => ({ ...f, copies: Number(e.target.value) || 1 }))}
            />
          </label>
          {form.locality === 'foreign' && (
            <>
              <label className="text-sm">
                <span className="mb-1 block text-slate-600">Destination country</span>
                <Input
                  required
                  value={form.destinationCountry}
                  onChange={(e) => setForm((f) => ({ ...f, destinationCountry: e.target.value }))}
                />
              </label>
              <label className="text-sm">
                <span className="mb-1 block text-slate-600">Agency</span>
                <Input
                  value={form.agency}
                  onChange={(e) => setForm((f) => ({ ...f, agency: e.target.value }))}
                />
              </label>
            </>
          )}
          <label className="flex items-center gap-2 text-sm sm:col-span-2">
            <input
              type="checkbox"
              checked={form.isFirstRequestAfterGraduation}
              onChange={(e) =>
                setForm((f) => ({ ...f, isFirstRequestAfterGraduation: e.target.checked }))
              }
            />
            First TOR request after graduation (physical document requirement)
          </label>
          <div className="sm:col-span-2 flex flex-wrap items-center gap-3">
            <Button type="submit" disabled={submit.isPending}>
              {submit.isPending ? 'Submitting…' : 'Submit request'}
            </Button>
            {submitOk && (
              <p className="text-sm text-emerald-700">
                Submitted. Reference{' '}
                <Link className="font-semibold underline" to={`/tor/${submitOk}`}>
                  {submitOk}
                </Link>
              </p>
            )}
            {submitError && <p className="text-sm text-red-600">{submitError}</p>}
          </div>
        </form>
      </SectionCard>

      <SectionCard title="Request list">
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end">
          <div className="sm:w-48">
            <Select
              label="Status"
              placeholder="All statuses"
              options={STATUS_OPTIONS}
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            />
          </div>
          <label className="text-sm flex-1">
            <span className="mb-1 block text-slate-600">Student number</span>
            <Input
              placeholder="Filter student number"
              value={studentNumber}
              onChange={(e) => setStudentNumber(e.target.value)}
            />
          </label>
        </div>
        {query.isLoading ? (
          <div className="flex justify-center py-10">
            <Spinner />
          </div>
        ) : rows.length === 0 ? (
          <EmptyState title="No transcript requests" description="Submit a request to get started." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-slate-50/80 text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="px-3 py-2">Reference</th>
                  <th className="px-3 py-2">Student</th>
                  <th className="px-3 py-2">Purpose</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Clearance</th>
                  <th className="px-3 py-2">Payment</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((r: TorRequest) => (
                  <tr key={r.id} className="hover:bg-slate-50/60">
                    <td className="px-3 py-2">
                      <Link
                        className="font-medium text-[var(--color-primary)] underline"
                        to={`/tor/${r.request_number}`}
                      >
                        {r.request_number}
                      </Link>
                    </td>
                    <td className="px-3 py-2">{r.student_number}</td>
                    <td className="px-3 py-2">{r.purpose}</td>
                    <td className="px-3 py-2">
                      <StatusBadge status={r.status} />
                    </td>
                    <td className="px-3 py-2 text-xs">{r.clearance_status ?? '—'}</td>
                    <td className="px-3 py-2 text-xs">{r.payment_status ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>
    </div>
  )
}
