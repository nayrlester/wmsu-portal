import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { PageHeader, SectionCard, StatusBadge } from '@/components/ui/page-chrome'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { useAuthStore } from '@/stores/auth-store'
import {
  addTorAttachmentRef,
  confirmPhysicalDocuments,
  generateTorDocument,
  getTorAcademicRecords,
  getTorRequest,
  issueTorDocument,
  listTorIssuances,
  transitionTorRequest,
  verifyTorPayment,
} from '../api/tor-api'

const NEXT_STATUS: Record<string, string> = {
  pending: 'processing',
  processing: 'approved',
  approved: 'released',
}

export function TorRequestDetailPage() {
  const { idOrNumber = '' } = useParams()
  const qc = useQueryClient()
  const user = useAuthStore((s) => s.user)
  const isStaff =
    Boolean(user?.isAdmin) ||
    (user?.permissions ?? []).some(
      (p) => p === 'torms.requests.process' || p === 'torms.foundation.admin'
    )

  const [transitionReason, setTransitionReason] = useState('')
  const [clearanceOverride, setClearanceOverride] = useState(false)
  const [paymentOverride, setPaymentOverride] = useState(false)
  const [paymentRef, setPaymentRef] = useState('')
  const [orNumber, setOrNumber] = useState('')
  const [udmsDocumentId, setUdmsDocumentId] = useState('')
  const [actionError, setActionError] = useState<string | null>(null)
  const [actionOk, setActionOk] = useState<string | null>(null)

  const detail = useQuery({
    queryKey: ['tor-request', idOrNumber],
    queryFn: () => getTorRequest(idOrNumber),
    enabled: Boolean(idOrNumber),
  })

  const academic = useQuery({
    queryKey: ['tor-academic', idOrNumber],
    queryFn: () => getTorAcademicRecords(idOrNumber, true),
    enabled: Boolean(idOrNumber) && detail.isSuccess,
  })

  const issuances = useQuery({
    queryKey: ['tor-issuances', idOrNumber],
    queryFn: () => listTorIssuances(idOrNumber),
    enabled: Boolean(idOrNumber) && detail.isSuccess && isStaff,
  })

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['tor-request', idOrNumber] })
    qc.invalidateQueries({ queryKey: ['tor-academic', idOrNumber] })
    qc.invalidateQueries({ queryKey: ['tor-issuances', idOrNumber] })
    qc.invalidateQueries({ queryKey: ['tor-requests'] })
  }

  const onErr = (err: unknown) => {
    setActionOk(null)
    const ax = err as { response?: { data?: { message?: string } } }
    setActionError(ax.response?.data?.message ?? 'Action failed')
  }

  const transition = useMutation({
    mutationFn: (toStatus: string) =>
      transitionTorRequest(idOrNumber, {
        toStatus,
        reason: transitionReason || undefined,
        clearanceOverride,
        paymentOverride,
      }),
    onSuccess: () => {
      setActionError(null)
      setActionOk('Status updated')
      invalidate()
    },
    onError: onErr,
  })

  const confirmPhysical = useMutation({
    mutationFn: () => confirmPhysicalDocuments(idOrNumber),
    onSuccess: () => {
      setActionError(null)
      setActionOk('Physical documents confirmed')
      invalidate()
    },
    onError: onErr,
  })

  const verifyPayment = useMutation({
    mutationFn: () => verifyTorPayment(idOrNumber, { paymentRef, orNumber: orNumber || undefined }),
    onSuccess: () => {
      setActionError(null)
      setActionOk('Payment verification recorded')
      invalidate()
    },
    onError: onErr,
  })

  const addAttachment = useMutation({
    mutationFn: () => addTorAttachmentRef(idOrNumber, { udmsDocumentId }),
    onSuccess: () => {
      setActionError(null)
      setActionOk('Document reference attached')
      setUdmsDocumentId('')
      invalidate()
    },
    onError: onErr,
  })

  const generateDoc = useMutation({
    mutationFn: () => generateTorDocument(idOrNumber, { copyType: 'official' }),
    onSuccess: (data) => {
      setActionError(null)
      setActionOk(`Generated draft ${data.issuance.serial_number} (structured only)`)
      invalidate()
    },
    onError: onErr,
  })

  const issueDoc = useMutation({
    mutationFn: (issuanceId: string) =>
      issueTorDocument(issuanceId, { releaseRequest: true }),
    onSuccess: (data) => {
      setActionError(null)
      setActionOk(`Issued ${data.issuance.serial_number}; request released if eligible`)
      invalidate()
    },
    onError: onErr,
  })

  if (detail.isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner />
      </div>
    )
  }

  if (detail.isError || !detail.data) {
    return (
      <div className="space-y-4">
        <PageHeader title="Transcript request" description="Unable to load this request." />
        <p className="text-sm text-red-600">Request not found or access denied.</p>
        <Link className="text-sm underline" to="/tor">
          Back to list
        </Link>
      </div>
    )
  }

  const req = detail.data.request
  const next = NEXT_STATUS[req.status]

  return (
    <div className="space-y-6">
      <PageHeader
        title={req.request_number}
        description={`Student ${req.student_number} · ${req.purpose ?? '—'}`}
        actions={
          <Link to="/tor">
            <Button variant="outline" type="button">
              Back
            </Button>
          </Link>
        }
      />

      {(actionError || actionOk) && (
        <p className={`text-sm ${actionError ? 'text-red-600' : 'text-emerald-700'}`}>
          {actionError ?? actionOk}
        </p>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard title="Request details">
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-slate-500">Status</dt>
              <dd className="mt-0.5">
                <StatusBadge status={req.status} />
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">Locality</dt>
              <dd className="mt-0.5 capitalize">{req.locality}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Clearance</dt>
              <dd className="mt-0.5">{req.clearance_status ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Payment</dt>
              <dd className="mt-0.5">{req.payment_status ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Copies</dt>
              <dd className="mt-0.5">{req.copies}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Requested</dt>
              <dd className="mt-0.5">{new Date(req.requested_at).toLocaleString()}</dd>
            </div>
            {req.first_request_tag && (
              <div className="col-span-2">
                <dt className="text-slate-500">First-request tag</dt>
                <dd className="mt-0.5 text-amber-800">{req.first_request_tag}</dd>
              </div>
            )}
            {req.destination_country && (
              <div>
                <dt className="text-slate-500">Destination</dt>
                <dd className="mt-0.5">{req.destination_country}</dd>
              </div>
            )}
            {req.agency && (
              <div>
                <dt className="text-slate-500">Agency</dt>
                <dd className="mt-0.5">{req.agency}</dd>
              </div>
            )}
          </dl>
        </SectionCard>

        <SectionCard title="Status history">
          {(detail.data.history ?? []).length === 0 ? (
            <p className="text-sm text-slate-500">No history yet.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {detail.data.history.map((h, i) => (
                <li key={i} className="border-b border-slate-100 pb-2">
                  <span className="font-medium">
                    {String(h.from_status ?? '—')} → {String(h.to_status)}
                  </span>
                  {h.reason ? <span className="text-slate-500"> · {String(h.reason)}</span> : null}
                  <div className="text-xs text-slate-400">
                    {h.transitioned_at
                      ? new Date(String(h.transitioned_at)).toLocaleString()
                      : ''}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      </div>

      <SectionCard title="Academic records (USiS)">
        {academic.isLoading ? (
          <div className="flex justify-center py-8">
            <Spinner />
          </div>
        ) : academic.isError ? (
          <p className="text-sm text-red-600">Failed to retrieve academic records.</p>
        ) : (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-3 text-xs text-slate-600">
              <span>Source: {String(academic.data?.source)}</span>
              <span>Retrieved: {String(academic.data?.retrievedAt ?? '')}</span>
              {academic.data?.incomplete && (
                <span className="font-medium text-amber-700">{String(academic.data.warning)}</span>
              )}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs uppercase text-slate-500">
                    <th className="px-2 py-1">Year</th>
                    <th className="px-2 py-1">Sem</th>
                    <th className="px-2 py-1">Code</th>
                    <th className="px-2 py-1">Title</th>
                    <th className="px-2 py-1">Units</th>
                    <th className="px-2 py-1">Grade</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {(academic.data?.ledgerProjection ?? []).map(
                    (line: Record<string, unknown>, idx: number) => (
                      <tr key={idx}>
                        <td className="px-2 py-1">{String(line.academic_year ?? '')}</td>
                        <td className="px-2 py-1">{String(line.semester ?? '')}</td>
                        <td className="px-2 py-1">{String(line.course_code ?? '')}</td>
                        <td className="px-2 py-1">{String(line.course_title ?? '')}</td>
                        <td className="px-2 py-1">{String(line.units ?? '')}</td>
                        <td className="px-2 py-1">{String(line.grade ?? '')}</td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
              {(academic.data?.ledgerProjection ?? []).length === 0 && (
                <p className="py-4 text-sm text-slate-500">No ledger projection lines.</p>
              )}
            </div>
          </div>
        )}
      </SectionCard>

      {isStaff && (
        <SectionCard title="Staff actions">
          <div className="grid gap-4 sm:grid-cols-2">
            {next && next !== 'released' && (
              <div className="space-y-2">
                <p className="text-sm font-medium">Advance status → {next}</p>
                <Input
                  placeholder="Reason (required for overrides)"
                  value={transitionReason}
                  onChange={(e) => setTransitionReason(e.target.value)}
                />
                <label className="flex items-center gap-2 text-xs">
                  <input
                    type="checkbox"
                    checked={clearanceOverride}
                    onChange={(e) => setClearanceOverride(e.target.checked)}
                  />
                  Clearance override (authorized)
                </label>
                <label className="flex items-center gap-2 text-xs">
                  <input
                    type="checkbox"
                    checked={paymentOverride}
                    onChange={(e) => setPaymentOverride(e.target.checked)}
                  />
                  Payment override (authorized)
                </label>
                <Button
                  type="button"
                  disabled={transition.isPending}
                  onClick={() => transition.mutate(next)}
                >
                  Transition to {next}
                </Button>
              </div>
            )}

            {(req.status === 'approved' || req.status === 'released') && (
              <div className="space-y-2 sm:col-span-2">
                <p className="text-sm font-medium">Generation and issuance</p>
                <p className="text-xs text-amber-700">
                  Structured academic payload only. Official University print template and digital
                  signature are not applied (FC #1 / #15).
                </p>
                <Button
                  type="button"
                  disabled={generateDoc.isPending}
                  onClick={() => generateDoc.mutate()}
                >
                  Generate structured transcript
                </Button>
                <div className="space-y-2">
                  {(issuances.data ?? []).map((row) => (
                    <div
                      key={row.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded border border-border px-3 py-2 text-sm"
                    >
                      <div>
                        <div className="font-medium">{row.serial_number}</div>
                        <div className="text-xs text-slate-600">
                          {row.issuance_status} · {row.copy_type} · verify{' '}
                          {row.qr_or_verification_code} · {row.compliance_status} · signature{' '}
                          {row.signature_status}
                        </div>
                      </div>
                      {row.issuance_status === 'draft' && (
                        <Button
                          type="button"
                          variant="outline"
                          disabled={issueDoc.isPending}
                          onClick={() => issueDoc.mutate(row.id)}
                        >
                          Issue and release
                        </Button>
                      )}
                    </div>
                  ))}
                  {(issuances.data ?? []).length === 0 && (
                    <p className="text-xs text-slate-500">No issuance drafts yet.</p>
                  )}
                </div>
              </div>
            )}

            {req.first_request_tag && (
              <div className="space-y-2">
                <p className="text-sm font-medium">Physical documents (TOR-023)</p>
                <Button
                  type="button"
                  variant="outline"
                  disabled={confirmPhysical.isPending}
                  onClick={() => confirmPhysical.mutate()}
                >
                  Confirm physical received
                </Button>
              </div>
            )}

            <div className="space-y-2">
              <p className="text-sm font-medium">Verify payment (UFMS)</p>
              <Input
                placeholder="Payment reference"
                value={paymentRef}
                onChange={(e) => setPaymentRef(e.target.value)}
              />
              <Input
                placeholder="OR number (optional)"
                value={orNumber}
                onChange={(e) => setOrNumber(e.target.value)}
              />
              <Button
                type="button"
                variant="outline"
                disabled={!paymentRef || verifyPayment.isPending}
                onClick={() => verifyPayment.mutate()}
              >
                Verify payment
              </Button>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium">Attach UDMS document reference</p>
              <Input
                placeholder="UDMS document id"
                value={udmsDocumentId}
                onChange={(e) => setUdmsDocumentId(e.target.value)}
              />
              <Button
                type="button"
                variant="outline"
                disabled={!udmsDocumentId || addAttachment.isPending}
                onClick={() => addAttachment.mutate()}
              >
                Attach reference
              </Button>
            </div>
          </div>
        </SectionCard>
      )}

      {(detail.data.attachments ?? []).length > 0 && (
        <SectionCard title="Supporting document references">
          <ul className="text-sm space-y-1">
            {detail.data.attachments.map((a, i) => (
              <li key={i}>
                {String(a.kind ?? 'doc')}: {String(a.udms_document_id ?? a.document_ref ?? '—')}
              </li>
            ))}
          </ul>
        </SectionCard>
      )}
    </div>
  )
}
