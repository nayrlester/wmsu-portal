import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Download, FileSpreadsheet, FileText, Play } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { DatePicker } from '@/components/ui/date-picker'
import { downloadReport, fetchReport, fetchReportTypes } from '@/lib/reports-api'
import { toast } from '@/lib/sweet-alert'
import { formatCents } from '@/types/fines'
import { cn } from '@/lib/utils'

function formatReportCell(key: string, value: unknown): string {
  if (value == null) return '—'
  if (typeof value === 'number' && /(_cents|Cents)$/.test(key)) {
    return formatCents(value)
  }
  return String(value)
}

function humanizeColumn(key: string) {
  return key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

export function ReportsPage() {
  const [selected, setSelected] = useState('collections')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')

  const { data: types } = useQuery({
    queryKey: ['report-types'],
    queryFn: fetchReportTypes,
  })

  const {
    data: report,
    isFetching,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['report', selected, from, to],
    queryFn: () => fetchReport(selected, { from: from || undefined, to: to || undefined }),
    enabled: false,
    retry: false,
  })

  const selectedMeta = types?.find((t) => t.type === selected)
  const selectedLabel =
    selectedMeta?.label ??
    selected.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())

  async function runReport() {
    const result = await refetch()
    if (result.error) {
      toast.error(result.error instanceof Error ? result.error.message : 'Report failed to load')
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Reports</h1>
        <p className="text-sm text-slate-500">
          TOR LIB-012 / LIB-013 / LIB-016 / LIB-029 reports (CSV / Excel / PDF)
        </p>
        <p className="mt-2 text-sm text-[var(--color-muted-foreground)]">
          Automated email delivery is configured under{' '}
          <Link to="/settings" className="font-medium text-[var(--color-primary)] hover:underline">
            Settings → Scheduled report email
          </Link>
          .
        </p>
      </div>

      <Card className="border-[var(--color-border)] shadow-sm">
        <CardContent className="grid gap-3 p-4 md:grid-cols-[1.2fr_1fr_1fr_auto]">
          <select
            className="rounded-xl border border-[var(--color-border)] bg-white px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[var(--color-primary)]/30"
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
            aria-label="Report type"
          >
            {(types ?? []).map((t) => (
              <option key={t.type} value={t.type}>
                {t.label}
                {t.tor?.length ? ` (${t.tor.join(', ')})` : ''}
              </option>
            ))}
          </select>
          <DatePicker
            value={from}
            onChange={(value) => {
              setFrom(value)
              if (to && value && to < value) setTo(value)
            }}
            placeholder="From date"
            className="w-full"
          />
          <DatePicker
            value={to}
            min={from || undefined}
            onChange={setTo}
            placeholder="To date"
            className="w-full"
          />
          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={() => void runReport()} disabled={isFetching} className="gap-1.5">
              <Play className="size-3.5" />
              {isFetching ? 'Running…' : 'Run'}
            </Button>
            <Button
              variant="outline"
              className="gap-1.5 border-[var(--color-border)] bg-white"
              onClick={() =>
                downloadReport(selected, 'csv', { from: from || undefined, to: to || undefined }).catch(
                  (err) => toast.error(err instanceof Error ? err.message : 'CSV export failed')
                )
              }
            >
              <FileSpreadsheet className="size-3.5" />
              CSV
            </Button>
            <Button
              variant="outline"
              className="gap-1.5 border-[var(--color-border)] bg-white"
              onClick={() =>
                downloadReport(selected, 'xlsx', {
                  from: from || undefined,
                  to: to || undefined,
                }).catch((err) =>
                  toast.error(err instanceof Error ? err.message : 'Excel export failed')
                )
              }
            >
              <FileSpreadsheet className="size-3.5" />
              Excel
            </Button>
            <Button
              variant="outline"
              className="gap-1.5 border-[var(--color-primary)]/30 bg-[var(--color-primary)]/5 text-[var(--color-primary)] hover:bg-[var(--color-primary)]/10"
              onClick={() =>
                downloadReport(selected, 'pdf', { from: from || undefined, to: to || undefined }).catch(
                  (err) => toast.error(err instanceof Error ? err.message : 'PDF export failed')
                )
              }
            >
              <FileText className="size-3.5" />
              PDF
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="overflow-hidden border-[var(--color-border)] shadow-sm">
        <div className="flex items-center justify-between gap-3 border-b border-[var(--color-border)] bg-[var(--color-primary)]/[0.04] px-4 py-3">
          <div>
            <p className="text-sm font-semibold text-[var(--color-foreground)]">{selectedLabel}</p>
            <p className="text-xs text-slate-500">
              {selectedMeta?.description}
              {selectedMeta?.tor?.length ? ` · ${selectedMeta.tor.join(', ')}` : ''}
            </p>
            <p className="text-xs text-slate-500">
              {report
                ? `${report.rowCount} rows · page ${report.meta?.page ?? 1}/${report.meta?.lastPage ?? 1} · generated ${new Date(report.generatedAt).toLocaleString()}`
                : 'Run a report to preview rows, then export CSV, Excel, or PDF'}
            </p>
          </div>
          {report ? (
            <div className="hidden items-center gap-1.5 text-xs text-slate-500 sm:flex">
              <Download className="size-3.5" />
              Preview shows first 100 rows
            </div>
          ) : null}
        </div>
        <CardContent className="overflow-x-auto p-0">
          {isFetching ? (
            <div
              className="flex min-h-[220px] flex-col items-center justify-center gap-2 px-6 py-12 text-center"
              data-testid="report-loading"
            >
              <p className="text-sm font-medium text-slate-700">Loading report…</p>
              <p className="max-w-sm text-sm text-slate-500">Querying source library records.</p>
            </div>
          ) : isError ? (
            <div
              className="flex min-h-[220px] flex-col items-center justify-center gap-2 px-6 py-12 text-center"
              data-testid="report-error"
            >
              <p className="text-sm font-medium text-rose-700">Report unavailable</p>
              <p className="max-w-sm text-sm text-slate-500">
                {error instanceof Error ? error.message : 'Unable to load report data.'}
              </p>
            </div>
          ) : !report ? (
            <div
              className="flex min-h-[220px] flex-col items-center justify-center gap-2 px-6 py-12 text-center"
              data-testid="report-empty-preview"
            >
              <div className="rounded-2xl bg-[var(--color-primary)]/10 p-3 text-[var(--color-primary)]">
                <FileText className="size-6" />
              </div>
              <p className="text-sm font-medium text-slate-700">No preview yet</p>
              <p className="max-w-sm text-sm text-slate-500">
                Choose a report type and click Run to load rows before exporting.
              </p>
            </div>
          ) : report.rows.length === 0 ? (
            <div
              className="flex min-h-[220px] flex-col items-center justify-center gap-2 px-6 py-12 text-center"
              data-testid="report-no-rows"
            >
              <p className="text-sm font-medium text-slate-700">No matching records</p>
              <p className="max-w-sm text-sm text-slate-500">
                Adjust filters or select another report. Totals remain based on source tables only.
              </p>
            </div>
          ) : (
            <table className="min-w-full text-left text-sm" data-testid="report-results-table">
              <thead>
                <tr className="bg-[var(--color-primary)]/[0.06] text-[11px] uppercase tracking-wide text-[var(--color-primary)]">
                  {Object.keys(report.rows[0] ?? { notice: '' }).map((key) => (
                    <th key={key} className="whitespace-nowrap px-4 py-3 font-semibold">
                      {humanizeColumn(key)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {report.rows.slice(0, 100).map((row, idx) => (
                  <tr
                    key={idx}
                    className={cn(
                      'border-b border-slate-100 transition-colors hover:bg-[var(--color-primary)]/[0.03]',
                      idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/70'
                    )}
                  >
                    {Object.entries(row).map(([key, value]) => (
                      <td key={key} className="whitespace-nowrap px-4 py-2.5 text-slate-700">
                        {formatReportCell(key, value)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
