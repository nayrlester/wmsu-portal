import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { PageHeader, SectionCard, StatusBadge } from '@/components/ui/page-chrome'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Spinner } from '@/components/ui/spinner'
import { EmptyState } from '@/components/ui/empty-state'
import { apiClient } from '@/lib/api-client'
import { fetchIssuanceReport, fetchRequestReport } from '../api/reports-api'

export function ReportsPage() {
  const [kind, setKind] = useState<'transcript' | 'certification'>('transcript')
  const [mode, setMode] = useState<'requests' | 'issuances'>('requests')
  const [status, setStatus] = useState('')
  const [locality, setLocality] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [exportError, setExportError] = useState<string | null>(null)

  const report = useQuery({
    queryKey: ['torms-report', mode, kind, status, locality, from, to],
    queryFn: () =>
      mode === 'requests'
        ? fetchRequestReport({
            kind,
            status: status || undefined,
            locality: locality || undefined,
            from: from || undefined,
            to: to || undefined,
            limit: 100,
          })
        : fetchIssuanceReport({
            kind,
            from: from || undefined,
            to: to || undefined,
            limit: 100,
          }),
  })

  const downloadCsv = async () => {
    setExportError(null)
    try {
      const path = mode === 'requests' ? '/torms/reports/requests' : '/torms/reports/issuances'
      const { data } = await apiClient.get(path, {
        params: {
          kind,
          status: mode === 'requests' ? status || undefined : undefined,
          locality: mode === 'requests' ? locality || undefined : undefined,
          from: from || undefined,
          to: to || undefined,
          format: 'csv',
          limit: 500,
        },
        responseType: 'blob',
      })
      const blob = new Blob([data], { type: 'text/csv;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `torms-${kind}-${mode}.csv`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      setExportError('CSV export failed')
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Operational reports"
        description="TORMS request and issuance reports from live database records (TOR-027 / TOR-034)."
      />

      <SectionCard title="Filters">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
          <Select
            label="Report"
            options={[
              { value: 'requests', label: 'Requests' },
              { value: 'issuances', label: 'Issuances' },
            ]}
            value={mode}
            onChange={(e) => setMode(e.target.value as 'requests' | 'issuances')}
          />
          <Select
            label="Kind"
            options={[
              { value: 'transcript', label: 'Transcript' },
              { value: 'certification', label: 'Certification' },
            ]}
            value={kind}
            onChange={(e) => setKind(e.target.value as 'transcript' | 'certification')}
          />
          {mode === 'requests' && (
            <>
              <Select
                label="Status"
                placeholder="All"
                options={[
                  { value: 'pending', label: 'pending' },
                  { value: 'processing', label: 'processing' },
                  { value: 'approved', label: 'approved' },
                  { value: 'released', label: 'released' },
                ]}
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              />
              <Select
                label="Locality"
                placeholder="All"
                options={[
                  { value: 'local', label: 'Local' },
                  { value: 'foreign', label: 'Foreign' },
                ]}
                value={locality}
                onChange={(e) => setLocality(e.target.value)}
              />
            </>
          )}
          <label className="text-sm">
            <span className="mb-1 block text-slate-600">From</span>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-slate-600">To</span>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </label>
        </div>
        <div className="mt-3">
          <Button type="button" variant="outline" onClick={() => downloadCsv()}>
            Export CSV
          </Button>
          {exportError && <p className="mt-2 text-sm text-red-600">{exportError}</p>}
        </div>
      </SectionCard>

      <SectionCard title="Results">
        {report.isLoading ? (
          <div className="flex justify-center py-10">
            <Spinner />
          </div>
        ) : (report.data?.items.length ?? 0) === 0 ? (
          <EmptyState title="No rows" description="Adjust filters or submit requests first." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs uppercase text-muted-foreground">
                  {mode === 'requests' ? (
                    <>
                      <th className="px-2 py-2">Reference</th>
                      <th className="px-2 py-2">Student</th>
                      <th className="px-2 py-2">Status</th>
                      <th className="px-2 py-2">Locality</th>
                      <th className="px-2 py-2">Requested</th>
                    </>
                  ) : (
                    <>
                      <th className="px-2 py-2">Serial</th>
                      <th className="px-2 py-2">Student</th>
                      <th className="px-2 py-2">Status</th>
                      <th className="px-2 py-2">Issued</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y">
                {report.data!.items.map((row, idx) => (
                  <tr key={String(row.id ?? idx)}>
                    {mode === 'requests' ? (
                      <>
                        <td className="px-2 py-2 font-medium">
                          {String(row.request_number ?? '')}
                        </td>
                        <td className="px-2 py-2">{String(row.student_number ?? '')}</td>
                        <td className="px-2 py-2">
                          <StatusBadge status={String(row.status ?? '')} />
                        </td>
                        <td className="px-2 py-2 capitalize">{String(row.locality ?? '')}</td>
                        <td className="px-2 py-2">
                          {row.requested_at
                            ? new Date(String(row.requested_at)).toLocaleString()
                            : '—'}
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-2 py-2 font-medium">
                          {String(row.serial_number ?? '')}
                        </td>
                        <td className="px-2 py-2">{String(row.student_number ?? '')}</td>
                        <td className="px-2 py-2">
                          <StatusBadge status={String(row.issuance_status ?? '')} />
                        </td>
                        <td className="px-2 py-2">
                          {row.issued_at
                            ? new Date(String(row.issued_at)).toLocaleString()
                            : '—'}
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-2 text-xs text-slate-500">
              Showing {report.data!.items.length} of {report.data!.meta.total}
            </p>
          </div>
        )}
      </SectionCard>
    </div>
  )
}
