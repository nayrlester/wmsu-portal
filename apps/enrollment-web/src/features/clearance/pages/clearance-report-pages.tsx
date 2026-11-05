import { useEffect, useRef, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
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
  LoadingState,
  PageHeader,
} from '@wmsu/ui'
import { RequirePermission } from '@/components/auth/require-permission'
import { getApiErrorMessage } from '@/lib/api-client'
import {
  fetchClearanceReportVerify,
  issueClearanceReport,
  type ClearanceReportIssuePayload,
} from '@/lib/usis-api'
import { useMyStudent } from '@/features/student/pages/student-portal-pages'

function ClearanceQr({ url }: { url: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !url) return
    void QRCode.toCanvas(canvas, url, { width: 168, margin: 1 })
  }, [url])
  return <canvas ref={canvasRef} className="rounded-lg border border-[var(--color-border)]" aria-label="Clearance verification QR code" />
}

function ClearanceReportPrintView({ report }: { report: ClearanceReportIssuePayload }) {
  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-white p-6 print:border-0" id="clearance-report-print">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-wide text-[var(--color-muted-foreground)]">WMSU USiS · ENR-025</p>
          <h2 className="text-xl font-semibold text-[var(--color-ink)]">Student clearance certificate</h2>
          <p className="mt-1 font-mono text-sm">{report.snapshot.studentNumber}</p>
          <p className="text-sm text-[var(--color-muted-foreground)]">{report.snapshot.studentName}</p>
        </div>
        <ClearanceQr url={report.verifyUrl} />
      </div>
      <div className="mt-4 flex items-center gap-2">
        <Badge variant={report.cleared ? 'success' : 'danger'}>{report.cleared ? 'Cleared' : 'With holds'}</Badge>
        <span className="text-xs text-[var(--color-muted-foreground)]">Issued {new Date(report.issuedAt ?? '').toLocaleString()}</span>
      </div>
      <p className="mt-3 text-xs font-mono text-[var(--color-muted-foreground)]">Checksum {report.snapshotChecksum.slice(0, 16)}…</p>
      <ul className="mt-4 space-y-1 text-sm">
        {Object.entries(report.snapshot.checks).map(([office, check]) => (
          <li key={office} className="flex justify-between gap-2 rounded-lg bg-[var(--color-canvas)] px-3 py-2">
            <span className="capitalize">{office}</span>
            <span>{check.cleared ? 'Cleared' : 'Hold / unavailable'}</span>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-xs text-[var(--color-muted-foreground)]">Scan QR to validate this document against the immutable USiS snapshot.</p>
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
  const [report, setReport] = useState<ClearanceReportIssuePayload | null>(null)
  const mutation = useMutation({
    mutationFn: (studentNumber: string) => issueClearanceReport(studentNumber),
    onSuccess: (data) => setReport(data),
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
      <PageHeader title="Clearance certificate" description="Generate a printable clearance report with QR validation (ENR-025)" />
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
          <Button type="button" variant="outline" onClick={() => window.print()}>
            Print
          </Button>
        </>
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
      <PageHeader title="Clearance verification" description="Public validation for ENR-025 QR documents" />
      <Card>
        <CardContent className="space-y-3 pt-6">
          <div className="flex items-center justify-between gap-2">
            <p className="font-mono text-sm">{data.studentNumber}</p>
            <Badge variant={data.cleared ? 'success' : 'danger'}>{data.cleared ? 'Cleared' : 'With holds'}</Badge>
          </div>
          <p className="text-sm">{data.studentName}</p>
          <Alert variant={data.checksumMatches ? 'success' : 'warning'} title="Document integrity">
            {data.checksumMatches ? 'Checksum matches stored snapshot.' : 'Checksum mismatch — treat as invalid.'}
          </Alert>
          <p className="text-xs text-[var(--color-muted-foreground)]">
            Issued {data.issuedAt ? new Date(data.issuedAt).toLocaleString() : '—'}
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
