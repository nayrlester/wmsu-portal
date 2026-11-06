import { useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { PageHeader, SectionCard } from '@/components/ui/page-chrome'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { apiClient, getApiErrorMessage } from '@/lib/api-client'

type PullResult = {
  received: number
  upserted: number
  discrepancies: number
  studentName?: string
}

type LedgerLine = {
  course_code?: string
  courseCode?: string
  grade?: number | string | null
  remarks?: string | null
}

type ArchiveReadiness = {
  available: boolean
  httpConfigured: boolean
  documentTypes: number
  offices: number
  repositoryRoute: string
  reason: string
}

export function AcademicSyncPage() {
  const [studentNumber, setStudentNumber] = useState('2026-PH-NEW001')
  const [result, setResult] = useState<PullResult | null>(null)
  const [error, setError] = useState('')
  const [archiveResult, setArchiveResult] = useState('')
  const [archiveError, setArchiveError] = useState('')
  const [routeResult, setRouteResult] = useState('')
  const [routeError, setRouteError] = useState('')
  const [ledgerText, setLedgerText] = useState('')
  const [ledgerError, setLedgerError] = useState('')

  const archive = useQuery({
    queryKey: ['torms', 'archive-readiness'],
    queryFn: async () => {
      const { data } = await apiClient.get('/torms/integrations/archive-readiness')
      return data.data as ArchiveReadiness
    },
  })

  const ledger = useMutation({
    mutationFn: async () => {
      const { data } = await apiClient.get(
        `/torms/sync/ledger/${encodeURIComponent(studentNumber.trim())}`
      )
      return data.data as { grades?: LedgerLine[] }
    },
    onSuccess: (data) => {
      setLedgerError('')
      const lines = data.grades ?? []
      if (lines.length === 0) {
        setLedgerText('No stored ledger lines for this student.')
        return
      }
      setLedgerText(
        lines
          .map((line) => {
            const code = line.course_code || line.courseCode || 'course'
            return `${code} · ${line.grade ?? '—'} · ${line.remarks ?? '—'}`
          })
          .join(' | ')
      )
    },
    onError: (err) => {
      setLedgerText('')
      setLedgerError(getApiErrorMessage(err, 'Ledger preview failed'))
    },
  })

  const saveArchive = useMutation({
    mutationFn: async () => {
      const { data } = await apiClient.post('/torms/integrations/archive-reference', {
        studentNumber: studentNumber.trim(),
      })
      return data.data as { trackingNumber?: string; created?: boolean }
    },
    onSuccess: (data) => {
      setArchiveError('')
      setArchiveResult(
        `Archive reference ${data.trackingNumber ?? 'stored'} · ${data.created ? 'created' : 'already stored'} · no file stored`
      )
    },
    onError: (err) => {
      setArchiveResult('')
      setArchiveError(getApiErrorMessage(err, 'Archive reference was not stored'))
    },
  })

  const routeArchive = useMutation({
    mutationFn: async () => {
      const { data } = await apiClient.post('/torms/integrations/archive-route', {
        studentNumber: studentNumber.trim(),
      })
      return data.data as {
        trackingNumber?: string
        action?: string
        status?: string
        alreadyRouted?: boolean
        fileStored?: boolean
      }
    },
    onSuccess: (data) => {
      setRouteError('')
      setRouteResult(
        `${data.trackingNumber ?? 'reference'} · ${data.action ?? 'forward'} · ${data.status ?? 'received'} · ${
          data.alreadyRouted ? 'already routed' : 'routing recorded'
        } · ${data.fileStored ? 'file stored' : 'no file stored'}`
      )
    },
    onError: (err) => {
      setRouteResult('')
      setRouteError(getApiErrorMessage(err, 'Routing decision was not recorded'))
    },
  })

  const pull = useMutation({
    mutationFn: async () => {
      const { data } = await apiClient.post('/torms/sync/usis/pull', {
        studentNumber: studentNumber.trim(),
      })
      return data.data as PullResult
    },
    onSuccess: (data) => {
      setError('')
      setResult(data)
    },
    onError: (err) => {
      setResult(null)
      setError(getApiErrorMessage(err, 'USiS sync failed'))
    },
  })

  return (
    <div className="space-y-4">
      <PageHeader
        title="Academic sync"
        description="Copy approved grades from USiS. TORMS does not re-encode them."
      />
      <SectionCard title="Pull from USiS">
        <form
          className="space-y-3"
          onSubmit={(event) => {
            event.preventDefault()
            pull.mutate()
          }}
        >
          <label className="block text-sm text-slate-600">
            Student number
            <Input
              className="mt-1"
              aria-label="Student number"
              value={studentNumber}
              onChange={(event) => setStudentNumber(event.target.value)}
            />
          </label>
          <Button type="submit" className="whitespace-nowrap" disabled={pull.isPending || studentNumber.trim().length < 3}>
            Pull from USiS
          </Button>
        </form>
        {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
        {result ? (
          <p className="mt-3 text-sm text-slate-700" data-testid="academic-sync-result">
            {result.studentName || studentNumber} · {result.received} grades received · {result.upserted} stored ·{' '}
            {result.discrepancies} discrepancies
          </p>
        ) : null}
      </SectionCard>
      <SectionCard title="Stored ledger">
        <p className="text-sm text-slate-600">
          Reads the TORMS ledger for this student. It does not issue a transcript.
        </p>
        <Button
          type="button"
          variant="secondary"
          className="mt-3 whitespace-nowrap"
          disabled={ledger.isPending || studentNumber.trim().length < 3}
          onClick={() => ledger.mutate()}
        >
          Show stored ledger
        </Button>
        {ledgerError ? <p className="mt-3 text-sm text-red-600">{ledgerError}</p> : null}
        {ledgerText ? (
          <p className="mt-3 text-sm text-slate-700" data-testid="ledger-preview">
            {ledgerText}
          </p>
        ) : null}
      </SectionCard>
      <SectionCard title="Document archive">
        {archive.isError ? (
          <p className="text-sm text-red-600">{getApiErrorMessage(archive.error, 'Archive check failed')}</p>
        ) : archive.data ? (
          <div className="space-y-3">
            <p className="text-sm text-slate-700" data-testid="archive-readiness">
              {archive.data.reason} Document types {archive.data.documentTypes}. Offices {archive.data.offices}.
            </p>
            <Button
              type="button"
              variant="secondary"
              className="whitespace-nowrap"
              disabled={saveArchive.isPending || studentNumber.trim().length < 3}
              onClick={() => saveArchive.mutate()}
            >
              Save archive reference
            </Button>
            {archiveError ? <p className="text-sm text-red-600">{archiveError}</p> : null}
            {archiveResult ? (
              <p className="text-sm text-slate-700" data-testid="archive-reference-result">
                {archiveResult}
              </p>
            ) : null}
            <Button
              type="button"
              variant="secondary"
              className="whitespace-nowrap"
              disabled={routeArchive.isPending || studentNumber.trim().length < 3}
              onClick={() => routeArchive.mutate()}
            >
              Record routing decision
            </Button>
            {routeError ? <p className="text-sm text-red-600">{routeError}</p> : null}
            {routeResult ? (
              <p className="text-sm text-slate-700" data-testid="archive-route-result">
                {routeResult}
              </p>
            ) : null}
          </div>
        ) : (
          <p className="text-sm text-slate-600">Checking the documents register…</p>
        )}
      </SectionCard>
    </div>
  )
}
