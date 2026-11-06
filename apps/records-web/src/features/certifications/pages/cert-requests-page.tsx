import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Pagination } from '@wmsu/ui'
import { PageHeader, SectionCard, StatusBadge } from '@/components/ui/page-chrome'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Spinner } from '@/components/ui/spinner'
import { EmptyState } from '@/components/ui/empty-state'
import { listTotalLabel, useListControls, usePaginatedQuery } from '@/lib/list-query'
import {
  listCertRequests,
  listCertTypes,
  submitCertRequest,
  type CertRequest,
} from '../api/cert-api'

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

export function CertRequestsPage() {
  const qc = useQueryClient()
  const controls = useListControls()
  const [status, setStatus] = useState('')
  const [studentNumber, setStudentNumber] = useState('')
  const [form, setForm] = useState({
    studentNumber: '',
    certificationType: '',
    purpose: 'employment',
    locality: 'local' as 'local' | 'foreign',
    destinationCountry: '',
    agency: '',
    copies: 1,
  })
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitOk, setSubmitOk] = useState<string | null>(null)

  const typesQuery = useQuery({
    queryKey: ['cert-types'],
    queryFn: () => listCertTypes(true),
  })

  const query = usePaginatedQuery({
    queryKey: ['cert-requests', status, studentNumber, controls.page, controls.pageSize],
    queryFn: () =>
      listCertRequests({
        status: status || undefined,
        studentNumber: studentNumber || undefined,
        page: controls.page,
        limit: controls.pageSize,
      }),
  })
  const rows = query.data?.data ?? []

  const typeOptions = useMemo(
    () =>
      (typesQuery.data ?? []).map((t) => ({
        value: t.code,
        label: t.official_name,
      })),
    [typesQuery.data]
  )

  const selectedType = (typesQuery.data ?? []).find((t) => t.code === form.certificationType)

  const submit = useMutation({
    mutationFn: () =>
      submitCertRequest({
        studentNumber: form.studentNumber.trim(),
        certificationType: form.certificationType,
        purpose: form.purpose.trim(),
        locality: form.locality,
        destinationCountry: form.destinationCountry || undefined,
        agency: form.agency || undefined,
        copies: form.copies,
      }),
    onSuccess: (data) => {
      setSubmitError(null)
      setSubmitOk(data.request.request_number as string)
      qc.invalidateQueries({ queryKey: ['cert-requests'] })
    },
    onError: (err: unknown) => {
      setSubmitOk(null)
      const ax = err as { response?: { data?: { message?: string } } }
      setSubmitError(ax.response?.data?.message ?? 'Submission failed')
    },
  })

  return (
    <div className="space-y-6">
      <PageHeader
        title="Certification Requests"
        description="Submit and track certification requests named in the TOR. Academic data is retrieved from USiS."
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
            label="Certification type"
            placeholder="Select type…"
            options={typeOptions}
            value={form.certificationType}
            onChange={(e) => setForm((f) => ({ ...f, certificationType: e.target.value }))}
            required
          />
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
              {selectedType && !selectedType.international_capable && (
                <p className="sm:col-span-2 text-xs text-amber-700">
                  Selected type is not international-capable. Use CAV, authentication, or
                  apostille-ready for foreign requests (TOR-022).
                </p>
              )}
            </>
          )}
          <div className="sm:col-span-2 flex flex-wrap items-center gap-3">
            <Button type="submit" disabled={submit.isPending || !form.certificationType}>
              {submit.isPending ? 'Submitting…' : 'Submit request'}
            </Button>
            {submitOk && (
              <p className="text-sm text-emerald-700">
                Submitted. Reference{' '}
                <Link className="font-semibold underline" to={`/certifications/${submitOk}`}>
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
              onChange={(e) => {
                controls.setPage(1)
                setStatus(e.target.value)
              }}
            />
          </div>
          <label className="text-sm flex-1">
            <span className="mb-1 block text-slate-600">Student number</span>
            <Input
              placeholder="Filter student number"
              value={studentNumber}
              onChange={(e) => {
                controls.setPage(1)
                setStudentNumber(e.target.value)
              }}
            />
          </label>
        </div>
        {query.isLoading ? (
          <div className="flex justify-center py-10">
            <Spinner />
          </div>
        ) : rows.length === 0 ? (
          <EmptyState
            title="No certification requests"
            description="Submit a request to get started."
          />
        ) : (
          <div className="space-y-3">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="border-b border-border bg-slate-50/80 text-left text-xs uppercase tracking-wider text-muted-foreground">
                    <th className="px-3 py-2">Reference</th>
                    <th className="px-3 py-2">Type</th>
                    <th className="px-3 py-2">Student</th>
                    <th className="px-3 py-2">Locality</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2">Payment</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {rows.map((r: CertRequest) => (
                    <tr key={r.id} className="hover:bg-slate-50/60">
                      <td className="px-3 py-2">
                        <Link
                          className="font-medium text-[var(--color-primary)] underline"
                          to={`/certifications/${r.request_number}`}
                        >
                          {r.request_number}
                        </Link>
                      </td>
                      <td className="px-3 py-2">{r.certification_type}</td>
                      <td className="px-3 py-2">{r.student_number}</td>
                      <td className="px-3 py-2 capitalize">{r.locality}</td>
                      <td className="px-3 py-2">
                        <StatusBadge status={r.status} />
                      </td>
                      <td className="px-3 py-2 text-xs">{r.payment_status ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination
              page={controls.page}
              pageCount={Math.max(1, query.data?.meta.lastPage ?? 1)}
              pageSize={controls.pageSize}
              onPageSizeChange={controls.setPageSize}
              onPageChange={controls.setPage}
              totalLabel={listTotalLabel(query.data?.meta, controls.page)}
            />
          </div>
        )}
      </SectionCard>
    </div>
  )
}
