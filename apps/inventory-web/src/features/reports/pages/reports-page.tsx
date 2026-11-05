import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import {
  Download,
  Package,
  HardDrive,
  ShoppingCart,
  TrendingDown,
  FileSpreadsheet,
  Printer,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { getApiErrorMessage } from '@/lib/api-client'
import { downloadReport, triggerBlobDownload } from '../api/reports-api'
import type { ReportDefinition, ReportType } from '../types'

const REPORTS: ReportDefinition[] = [
  {
    id: 'stock-inventory',
    title: 'Stock Inventory',
    description: 'Current stock balances by warehouse and item.',
  },
  {
    id: 'property-ledger',
    title: 'Property Ledger',
    description: 'PPE register with acquisition cost and custodians.',
  },
  {
    id: 'consumption',
    title: 'Consumption',
    description: 'Issued and consumed supplies over the period.',
  },
  {
    id: 'depreciation',
    title: 'Depreciation',
    description: 'Depreciation expense and book values.',
  },
]

const ICONS: Record<ReportType, typeof Package> = {
  'stock-inventory': Package,
  'property-ledger': HardDrive,
  consumption: ShoppingCart,
  depreciation: TrendingDown,
}

async function printReportPdf(type: ReportType, title: string) {
  const blob = await downloadReport(type, 'csv')
  const text = await blob.text()
  const rows = text
    .trim()
    .split(/\r?\n/)
    .map((line) => line.split(',').map((c) => c.replace(/^"|"$/g, '').replace(/""/g, '"')))
  const [header, ...body] = rows
  const win = window.open('', '_blank', 'noopener,noreferrer,width=1024,height=768')
  if (!win) throw new Error('Popup blocked — allow popups to print PDF')
  const tableHead = (header ?? []).map((h) => `<th>${escapeHtml(h)}</th>`).join('')
  const tableBody = body
    .slice(0, 2000)
    .map((r) => `<tr>${r.map((c) => `<td>${escapeHtml(c)}</td>`).join('')}</tr>`)
    .join('')
  win.document.write(`<!doctype html><html><head><title>${escapeHtml(title)}</title>
<style>
  @page { size: A4 landscape; margin: 12mm; }
  body { font-family: system-ui, sans-serif; color: #12122a; }
  h1 { font-size: 18px; margin: 0 0 4px; }
  p { margin: 0 0 16px; color: #6b6f8c; font-size: 12px; }
  table { width: 100%; border-collapse: collapse; font-size: 11px; }
  th, td { border: 1px solid #dde1f5; padding: 6px 8px; text-align: left; }
  th { background: #f3f4ff; }
  @media print { button { display: none; } }
</style></head><body>
  <button onclick="window.print()" style="margin-bottom:12px">Print / Save as PDF</button>
  <h1>${escapeHtml(title)}</h1>
  <p>Generated ${new Date().toLocaleString()} · Change page size/orientation in the print dialog</p>
  <table><thead><tr>${tableHead}</tr></thead><tbody>${tableBody}</tbody></table>
</body></html>`)
  win.document.close()
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export function ReportsPage() {
  const [error, setError] = useState('')
  const [active, setActive] = useState<ReportType | null>(null)
  const [mode, setMode] = useState<'csv' | 'pdf' | null>(null)

  const mutation = useMutation({
    mutationFn: async ({ type, action }: { type: ReportType; action: 'csv' | 'pdf' }) => {
      setActive(type)
      setMode(action)
      setError('')
      if (action === 'csv') {
        const blob = await downloadReport(type, 'csv')
        triggerBlobDownload(blob, `${type}-${new Date().toISOString().slice(0, 10)}.csv`)
        return
      }
      const title = REPORTS.find((r) => r.id === type)?.title ?? type
      await printReportPdf(type, title)
    },
    onError: (err) => setError(getApiErrorMessage(err)),
    onSettled: () => {
      setActive(null)
      setMode(null)
    },
  })

  return (
    <div className="space-y-4 animate-fade-up">
      <div>
        <h1>Reports</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Download CSV or print/save PDF (page size & orientation via browser print dialog)
        </p>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
          {error}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {REPORTS.map((report) => {
          const Icon = ICONS[report.id]
          const loading = mutation.isPending && active === report.id
          return (
            <div key={report.id} className="uims-card flex flex-col gap-4 p-5">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[var(--color-primary-soft)] text-[var(--color-primary)]">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <h2 className="font-semibold text-[var(--color-ink)]">{report.title}</h2>
                  <p className="mt-1 text-sm text-muted-foreground">{report.description}</p>
                </div>
              </div>
              <div className="mt-auto flex flex-wrap gap-2" data-print-hide>
                <Button
                  disabled={mutation.isPending}
                  onClick={() => mutation.mutate({ type: report.id, action: 'csv' })}
                >
                  {loading && mode === 'csv' ? (
                    <Spinner className="h-4 w-4" />
                  ) : (
                    <Download className="h-4 w-4" />
                  )}
                  Download CSV
                </Button>
                <Button
                  variant="outline"
                  disabled={mutation.isPending}
                  onClick={() => mutation.mutate({ type: report.id, action: 'pdf' })}
                >
                  {loading && mode === 'pdf' ? (
                    <Spinner className="h-4 w-4" />
                  ) : (
                    <Printer className="h-4 w-4" />
                  )}
                  Print / PDF
                </Button>
              </div>
            </div>
          )
        })}
      </div>

      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <FileSpreadsheet className="h-3.5 w-3.5" />
        CSV via API; PDF uses browser print with selectable page size/orientation.
      </div>
    </div>
  )
}
