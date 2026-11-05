import { useEffect, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useParams } from 'react-router-dom'
import QRCode from 'qrcode'
import {
  Alert,
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  FormField,
  Input,
  LoadingState,
  PageHeader,
  Select,
  useNotification,
} from '@wmsu/ui'
import { RequirePermission } from '@/components/auth/require-permission'
import { getApiErrorMessage } from '@/lib/api-client'
import {
  advanceOfficeClearanceItem,
  createOfficeReferral,
  downloadClearanceReportPdf,
  fetchClearanceReports,
  fetchClearanceReportVerify,
  fetchOfficeClearanceRequirements,
  fetchStudents,
  fetchUnifiedStudentSupportProfile,
  issueClearanceReport,
  syncStudentOfficeClearance,
  type ClearanceReportIssuePayload,
  type OfficeClearanceBundle,
} from '@/lib/usis-api'
import { useMyStudent } from '@/features/student/pages/student-portal-pages'

function ClearanceQr({ url }: { url: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !url) return
    void QRCode.toCanvas(canvas, url, { width: 168, margin: 1 })
  }, [url])
  return (
    <canvas
      ref={canvasRef}
      className="rounded-lg border border-[var(--color-border)]"
      aria-label="Clearance verification QR code"
    />
  )
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function ClearanceReportPrintView({ report }: { report: ClearanceReportIssuePayload }) {
  return (
    <div
      className="rounded-xl border border-[var(--color-border)] bg-white p-6 print:border-0"
      id="clearance-report-print"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-wide text-[var(--color-muted-foreground)]">
            WMSU USiS
          </p>
          <h2 className="text-xl font-semibold text-[var(--color-ink)]">
            Student clearance certificate
          </h2>
          <p className="mt-1 font-mono text-sm">{report.snapshot.studentNumber}</p>
          <p className="text-sm text-[var(--color-muted-foreground)]">
            {report.snapshot.studentName}
          </p>
        </div>
        <ClearanceQr url={report.verifyUrl} />
      </div>
      <div className="mt-4 flex items-center gap-2">
        <Badge variant={report.cleared ? 'success' : 'danger'}>
          {report.cleared ? 'Cleared' : 'With holds'}
        </Badge>
        <span className="text-xs text-[var(--color-muted-foreground)]">
          Issued {new Date(report.issuedAt ?? '').toLocaleString()}
        </span>
      </div>
      <p className="mt-3 text-xs font-mono text-[var(--color-muted-foreground)]">
        Checksum {report.snapshotChecksum.slice(0, 16)}…
      </p>
      <ul className="mt-4 space-y-1 text-sm">
        {Object.entries(report.snapshot.checks).map(([office, check]) => (
          <li
            key={office}
            className="flex justify-between gap-2 rounded-lg bg-[var(--color-canvas)] px-3 py-2"
          >
            <span className="capitalize">{office}</span>
            <span>{check.cleared ? 'Cleared' : 'Hold / unavailable'}</span>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-xs text-[var(--color-muted-foreground)]">
        Scan QR to validate this document against the immutable USiS snapshot.
      </p>
    </div>
  )
}

function ReportActions({
  report,
}: {
  report: Pick<ClearanceReportIssuePayload, 'documentToken' | 'verifyUrl'>
}) {
  const { notify } = useNotification()
  const pdfMutation = useMutation({
    mutationFn: () => downloadClearanceReportPdf(report.documentToken),
    onSuccess: (blob) => {
      downloadBlob(blob, `clearance-${report.documentToken.slice(0, 8)}.pdf`)
      notify({ tone: 'success', title: 'PDF downloaded' })
    },
    onError: (err) =>
      notify({ tone: 'danger', title: 'PDF failed', description: getApiErrorMessage(err) }),
  })
  return (
    <div className="flex flex-wrap gap-2 print:hidden">
      <Button type="button" variant="outline" onClick={() => window.print()}>
        Print
      </Button>
      <Button
        type="button"
        variant="secondary"
        disabled={pdfMutation.isPending}
        onClick={() => pdfMutation.mutate()}
      >
        Download PDF package
      </Button>
      <a
        className="text-sm underline self-center"
        href={report.verifyUrl}
        target="_blank"
        rel="noreferrer"
      >
        Open verify link
      </a>
    </div>
  )
}

export function StudentClearanceReportPage() {
  return (
    <RequirePermission anyOf={['clearance.read']}>
      <StudentClearanceReportInner />
    </RequirePermission>
  )
}

function StudentClearanceReportInner() {
  const studentQuery = useMyStudent()
  const qc = useQueryClient()
  const [report, setReport] = useState<ClearanceReportIssuePayload | null>(null)
  const recent = useQuery({
    queryKey: ['clearance', 'reports', 'mine'],
    queryFn: () => fetchClearanceReports({ limit: 10 }),
    enabled: Boolean(studentQuery.data?.id),
  })
  const mutation = useMutation({
    mutationFn: (studentNumber: string) => issueClearanceReport(studentNumber),
    onSuccess: (data) => {
      setReport(data)
      void qc.invalidateQueries({ queryKey: ['clearance', 'reports'] })
    },
  })

  if (studentQuery.isLoading) return <LoadingState label="Loading profile" />
  if (!studentQuery.data) {
    return (
      <Alert variant="warning" title="No student profile">
        Link your account to a student record before generating clearance.
      </Alert>
    )
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Clearance certificate"
        description="Generate a printable clearance report with QR validation"
      />
      <Card>
        <CardHeader>
          <CardTitle>Issue report</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-[var(--color-muted-foreground)]">
            Student <span className="font-mono">{studentQuery.data.studentNumber}</span>
          </p>
          <Button
            type="button"
            disabled={mutation.isPending}
            onClick={() => mutation.mutate(studentQuery.data!.studentNumber)}
          >
            Generate clearance report
          </Button>
          {mutation.isError ? (
            <Alert variant="danger" title="Issue failed">
              {getApiErrorMessage(mutation.error)}
            </Alert>
          ) : null}
        </CardContent>
      </Card>
      {report ? (
        <>
          <ClearanceReportPrintView report={report} />
          <ReportActions report={report} />
        </>
      ) : null}
      {(recent.data ?? []).length ? (
        <Card>
          <CardHeader>
            <CardTitle>Recent certificates</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {recent.data!.map((row) => (
              <div
                key={row.reportId}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[var(--color-border)] px-3 py-2"
              >
                <span>
                  {row.issuedAt ? new Date(row.issuedAt).toLocaleString() : '—'} ·{' '}
                  {row.cleared ? 'Cleared' : 'With holds'}
                </span>
                <a className="underline" href={row.verifyUrl} target="_blank" rel="noreferrer">
                  Verify
                </a>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}

export function RegistrarClearanceReportPage() {
  return (
    <RequirePermission anyOf={['clearance.read', 'students.read']}>
      <RegistrarClearanceReportInner />
    </RequirePermission>
  )
}

function RegistrarClearanceReportInner() {
  const { notify } = useNotification()
  const qc = useQueryClient()
  const [studentNumber, setStudentNumber] = useState('')
  const [studentId, setStudentId] = useState('')
  const [fromOffice, setFromOffice] = useState<'guidance' | 'health'>('guidance')
  const [toOffice, setToOffice] = useState<'guidance' | 'health' | 'osa' | 'scholarship'>('health')
  const [reason, setReason] = useState('')
  const [report, setReport] = useState<ClearanceReportIssuePayload | null>(null)
  const [officeClearance, setOfficeClearance] = useState<OfficeClearanceBundle | null>(null)
  const recent = useQuery({
    queryKey: ['clearance', 'reports', 'registrar', studentNumber],
    queryFn: () =>
      fetchClearanceReports({
        studentNumber: studentNumber.trim() || undefined,
        limit: 20,
      }),
  })
  const requirements = useQuery({
    queryKey: ['clearance', 'office-requirements'],
    queryFn: () => fetchOfficeClearanceRequirements(),
  })
  const unified = useQuery({
    queryKey: ['clearance', 'unified', studentId],
    queryFn: () => fetchUnifiedStudentSupportProfile(studentId),
    enabled: Boolean(studentId),
  })
  const issue = useMutation({
    mutationFn: () => issueClearanceReport(studentNumber.trim()),
    onSuccess: (data) => {
      setReport(data)
      notify({ tone: 'success', title: 'Clearance report issued' })
      void qc.invalidateQueries({ queryKey: ['clearance', 'reports'] })
    },
    onError: (err) =>
      notify({ tone: 'danger', title: 'Issue failed', description: getApiErrorMessage(err) }),
  })
  const resolveStudent = useMutation({
    mutationFn: async () => {
      const page = await fetchStudents({ limit: 50, search: studentNumber.trim() })
      const rows = page.data ?? []
      const match =
        rows.find((r) => r.studentNumber === studentNumber.trim()) ??
        rows.find((r) => r.studentNumber?.includes(studentNumber.trim()))
      if (!match?.id) throw new Error('Student not found for that number')
      return match.id
    },
    onSuccess: (id) => {
      setStudentId(id)
      notify({ tone: 'success', title: 'Loaded cross-office profile' })
    },
    onError: (err) =>
      notify({ tone: 'danger', title: 'Lookup failed', description: getApiErrorMessage(err) }),
  })
  const refer = useMutation({
    mutationFn: () =>
      createOfficeReferral({
        studentId,
        fromOffice,
        toOffice,
        reasonSummary: reason.trim() || undefined,
      }),
    onSuccess: () => {
      notify({ tone: 'success', title: 'Referral created' })
      setReason('')
      void qc.invalidateQueries({ queryKey: ['clearance', 'unified', studentId] })
    },
    onError: (err) =>
      notify({ tone: 'danger', title: 'Referral failed', description: getApiErrorMessage(err) }),
  })
  const syncOffice = useMutation({
    mutationFn: async () => {
      let id = studentId
      if (!id) {
        const page = await fetchStudents({ limit: 50, search: studentNumber.trim() })
        const rows = page.data ?? []
        const match =
          rows.find((r) => r.studentNumber === studentNumber.trim()) ??
          rows.find((r) => r.studentNumber?.includes(studentNumber.trim()))
        if (!match?.id) throw new Error('Student not found for that number')
        id = match.id
        setStudentId(id)
      }
      return syncStudentOfficeClearance(id)
    },
    onSuccess: (data) => {
      setOfficeClearance(data)
      notify({ tone: 'success', title: 'Office clearance synced' })
    },
    onError: (err) =>
      notify({ tone: 'danger', title: 'Office sync failed', description: getApiErrorMessage(err) }),
  })
  const waiveItem = useMutation({
    mutationFn: (itemId: string) =>
      advanceOfficeClearanceItem(itemId, { status: 'waived', notes: 'Staff waiver' }),
    onSuccess: (data) => {
      setOfficeClearance(data)
      notify({ tone: 'success', title: 'Item waived' })
    },
    onError: (err) =>
      notify({ tone: 'danger', title: 'Advance failed', description: getApiErrorMessage(err) }),
  })

  return (
    <div className="space-y-4">
      <PageHeader
        title="Clearance & cross-office workflow"
        description="Per-office requirements, QR print, and advisory SSS profile"
      />
      <Card>
        <CardHeader>
          <CardTitle>Issue for student</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <FormField id="clearanceStudentNumber" label="Student number" required>
            <Input
              id="clearanceStudentNumber"
              value={studentNumber}
              onChange={(e) => setStudentNumber(e.target.value)}
              placeholder="e.g. 2026-00001"
            />
          </FormField>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              disabled={!studentNumber.trim() || issue.isPending}
              onClick={() => issue.mutate()}
            >
              Generate clearance report
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={!studentNumber.trim() || syncOffice.isPending}
              onClick={() => syncOffice.mutate()}
            >
              Sync office clearance
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={!studentNumber.trim() || resolveStudent.isPending}
              onClick={() => resolveStudent.mutate()}
            >
              Load unified profile
            </Button>
          </div>
        </CardContent>
      </Card>
      {(requirements.data ?? []).length ? (
        <Card>
          <CardHeader>
            <CardTitle>Configured office requirements</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            {(requirements.data ?? []).map((r) => (
              <div
                key={r.id}
                className="flex flex-wrap justify-between gap-2 rounded-lg bg-[var(--color-canvas)] px-3 py-2"
              >
                <span>
                  {r.office} · {r.requirementCode} · {r.label}
                </span>
                <span className="text-[var(--color-muted-foreground)]">
                  {r.autoSource ?? 'manual'}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}
      {officeClearance ? (
        <Card>
          <CardHeader>
            <CardTitle>Student office clearance workflow</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <Alert
              variant={officeClearance.overallCleared ? 'success' : 'info'}
              title={
                officeClearance.overallCleared
                  ? 'All office items cleared/waived'
                  : `Holds: ${officeClearance.holdOffices.join(', ') || 'none'}`
              }
            >
              Auto-synced from finance/library/inventory + SSS/academic sources where configured.
            </Alert>
            {officeClearance.offices.map((office) => (
              <div key={office.office} className="space-y-1">
                <div className="font-medium capitalize">
                  {office.office} · {office.cleared ? 'cleared' : 'hold'}
                </div>
                <ul className="space-y-1">
                  {office.items.map((item) => (
                    <li
                      key={item.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[var(--color-border)] px-3 py-2"
                    >
                      <span>
                        {item.label} · {item.status}
                        {item.autoSynced ? ' · auto' : ''}
                      </span>
                      {item.status !== 'waived' && item.status !== 'cleared' ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={waiveItem.isPending}
                          onClick={() => waiveItem.mutate(item.id)}
                        >
                          Waive
                        </Button>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}
      {report ? (
        <>
          <ClearanceReportPrintView report={report} />
          <ReportActions report={report} />
        </>
      ) : null}
      {unified.isLoading ? <LoadingState label="Loading unified profile" /> : null}
      {unified.data ? (
        <Card>
          <CardHeader>
            <CardTitle>Cross-office clearance</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <Alert variant="info" title={`Gate mode: ${unified.data.clearance.enrollmentGateMode}`}>
              {unified.data.clearance.overallAdvisoryCleared
                ? 'No advisory holds across Guidance / Health / OSA.'
                : `Holds: ${unified.data.clearance.holdOffices.join(', ')}`}
            </Alert>
            <ul className="space-y-1">
              {Object.entries(unified.data.clearance.offices).map(([office, row]) => (
                <li
                  key={office}
                  className="flex justify-between gap-2 rounded-lg bg-[var(--color-canvas)] px-3 py-2"
                >
                  <span className="capitalize">{office}</span>
                  <span>{row.cleared ? 'Cleared' : 'Hold / review'}</span>
                </li>
              ))}
            </ul>
            <div>
              <div className="font-medium">Alerts</div>
              {(unified.data.alerts ?? []).length ? (
                <ul className="mt-1 space-y-1">
                  {unified.data.alerts.slice(0, 8).map((a) => (
                    <li key={a.id}>
                      {a.templateCode} · {a.status}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-[var(--color-muted-foreground)]">No SSS alerts queued.</p>
              )}
            </div>
            <div className="grid max-w-xl gap-3 sm:grid-cols-2">
              <FormField id="fromOffice" label="From office">
                <Select
                  id="fromOffice"
                  value={fromOffice}
                  onChange={(e) => setFromOffice(e.target.value as 'guidance' | 'health')}
                >
                  <option value="guidance">Guidance</option>
                  <option value="health">Health</option>
                </Select>
              </FormField>
              <FormField id="toOffice" label="To office">
                <Select
                  id="toOffice"
                  value={toOffice}
                  onChange={(e) =>
                    setToOffice(e.target.value as 'guidance' | 'health' | 'osa' | 'scholarship')
                  }
                >
                  <option value="guidance">Guidance</option>
                  <option value="health">Health</option>
                  <option value="osa">OSA</option>
                  <option value="scholarship">Scholarship</option>
                </Select>
              </FormField>
              <FormField id="referralReason" label="Reason">
                <Input
                  id="referralReason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />
              </FormField>
            </div>
            <Button
              type="button"
              disabled={!studentId || refer.isPending}
              onClick={() => refer.mutate()}
            >
              Create office referral
            </Button>
            {unified.data.referrals.guidance.length || unified.data.referrals.health.length ? (
              <div>
                <div className="font-medium">Open / recent referrals</div>
                <ul className="mt-1 space-y-1">
                  {unified.data.referrals.guidance.map((r) => (
                    <li key={r.id}>
                      Guidance → {r.toOffice} · {r.status}
                    </li>
                  ))}
                  {unified.data.referrals.health.map((r) => (
                    <li key={r.id}>
                      Health → {r.toOffice ?? 'facility'} · {r.status}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : null}
      {(recent.data ?? []).length ? (
        <Card>
          <CardHeader>
            <CardTitle>Recent issued reports</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {recent.data!.map((row) => (
              <div
                key={row.reportId}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[var(--color-border)] px-3 py-2"
              >
                <span>
                  {row.studentNumber} · {row.studentName} · {row.cleared ? 'Cleared' : 'Holds'}
                </span>
                <a className="underline" href={row.verifyUrl} target="_blank" rel="noreferrer">
                  Verify
                </a>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}

export function ClearanceVerifyPage() {
  const { token = '' } = useParams()
  const verify = useQuery({
    queryKey: ['clearance', 'verify', token],
    queryFn: () => fetchClearanceReportVerify(token),
    enabled: !!token,
  })

  if (verify.isLoading) return <LoadingState label="Validating clearance document" />

  const data = verify.data
  if (!data?.valid) {
    return (
      <div className="mx-auto flex min-h-screen max-w-lg items-center px-4">
        <Alert variant="danger" title="Invalid or unknown document">
          This QR code does not match an active USiS clearance report.
        </Alert>
      </div>
    )
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-lg flex-col justify-center gap-4 px-4 py-8">
      <PageHeader title="Clearance verification" description="Public validation for QR documents" />
      <Card>
        <CardContent className="space-y-3 pt-6">
          <div className="flex items-center justify-between gap-2">
            <p className="font-mono text-sm">{data.studentNumber}</p>
            <Badge variant={data.cleared ? 'success' : 'danger'}>
              {data.cleared ? 'Cleared' : 'With holds'}
            </Badge>
          </div>
          <p className="text-sm">{data.studentName}</p>
          <Alert variant={data.checksumMatches ? 'success' : 'warning'} title="Document integrity">
            {data.checksumMatches
              ? 'Checksum matches stored snapshot.'
              : 'Checksum mismatch — treat as invalid.'}
          </Alert>
          <p className="text-xs text-[var(--color-muted-foreground)]">
            Issued {data.issuedAt ? new Date(data.issuedAt).toLocaleString() : '—'}
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
