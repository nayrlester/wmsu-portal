import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  addShelfScan,
  fetchShelfCount,
  fetchShelfCounts,
  startShelfCount,
} from '@/lib/hardware-api'
import { downloadReport } from '@/lib/reports-api'
import { getApiErrorMessage } from '@/lib/api-client'
import { toast } from '@/lib/sweet-alert'

export function InventoryPage() {
  const qc = useQueryClient()
  const [shelfCode, setShelfCode] = useState('')
  const [scanValue, setScanValue] = useState('')
  const [activeId, setActiveId] = useState<string | null>(null)

  const sessions = useQuery({
    queryKey: ['inventory-sessions'],
    queryFn: fetchShelfCounts,
  })

  const detail = useQuery({
    queryKey: ['inventory-session', activeId],
    queryFn: () => fetchShelfCount(activeId!),
    enabled: Boolean(activeId),
  })

  const start = useMutation({
    mutationFn: () => startShelfCount(shelfCode.trim()),
    onSuccess: (report) => {
      setActiveId(report.id)
      qc.invalidateQueries({ queryKey: ['inventory-sessions'] })
      toast.success(`Shelf count started for ${report.shelfCode}`)
    },
    onError: (err) => toast.error(getApiErrorMessage(err) || 'Could not start count'),
  })

  const scan = useMutation({
    mutationFn: () => addShelfScan(activeId!, scanValue.trim()),
    onSuccess: (report) => {
      setScanValue('')
      qc.setQueryData(['inventory-session', activeId], report)
      qc.invalidateQueries({ queryKey: ['inventory-sessions'] })
    },
    onError: (err) => toast.error(getApiErrorMessage(err) || 'Scan failed'),
  })

  const exportDiscrepancy = useMutation({
    mutationFn: async () => {
      const blob = await downloadReport('shelf_discrepancy', 'csv')
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = 'shelf-discrepancy.csv'
      anchor.click()
      URL.revokeObjectURL(url)
    },
    onError: (err) => toast.error(getApiErrorMessage(err) || 'Export failed'),
  })

  const report = detail.data

  return (
    <div className="space-y-6" data-testid="inventory-page">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Shelf inventory</h1>
        <p className="text-sm text-slate-500">
          Shelf-reading sessions and discrepancy tracking (LIB-002 / LIB-018)
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Start session</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end gap-3">
          <div className="min-w-[12rem] flex-1">
            <Input
              label="Shelf code"
              placeholder="e.g. CAT-01"
              value={shelfCode}
              onChange={(e) => setShelfCode(e.target.value)}
            />
          </div>
          <Button
            disabled={!shelfCode.trim() || start.isPending}
            onClick={() => start.mutate()}
          >
            Start count
          </Button>
        </CardContent>
      </Card>

      {activeId && report ? (
        <Card>
          <CardHeader>
            <CardTitle>
              Active session — {report.shelfCode}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-3 text-sm">
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-emerald-800">
                Seen {report.seen.length}
              </span>
              <span className="rounded-full bg-amber-50 px-3 py-1 text-amber-900">
                Missing {report.missing.length}
              </span>
              <span className="rounded-full bg-sky-50 px-3 py-1 text-sky-900">
                Elsewhere {report.elsewhere.length}
              </span>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-700">
                Unknown scans {report.unknown.length}
              </span>
            </div>
            <div className="flex flex-wrap items-end gap-3">
              <div className="min-w-[14rem] flex-1">
                <Input
                  label="Scan barcode or RFID"
                  placeholder="Scan value"
                  value={scanValue}
                  onChange={(e) => setScanValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && scanValue.trim()) scan.mutate()
                  }}
                />
              </div>
              <Button disabled={!scanValue.trim() || scan.isPending} onClick={() => scan.mutate()}>
                Add scan
              </Button>
              <Button
                variant="outline"
                disabled={exportDiscrepancy.isPending}
                onClick={() => exportDiscrepancy.mutate()}
              >
                Export discrepancy CSV
              </Button>
            </div>
            {report.missing.length > 0 ? (
              <div className="overflow-x-auto rounded-2xl border border-amber-100">
                <table className="min-w-full text-sm">
                  <thead className="bg-amber-50 text-left text-xs uppercase text-amber-900">
                    <tr>
                      <th className="px-4 py-2">Barcode</th>
                      <th className="px-4 py-2">Title</th>
                      <th className="px-4 py-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.missing.map((row) => (
                      <tr key={row.copyId} className="border-t border-amber-50">
                        <td className="px-4 py-2 font-mono text-xs">{row.barcode}</td>
                        <td className="px-4 py-2">{row.bookTitle}</td>
                        <td className="px-4 py-2">{row.copyStatus}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Recent sessions</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="divide-y divide-slate-100 text-sm">
            {(sessions.data ?? []).map((row) => (
              <li key={row.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                <div>
                  <p className="font-medium">{row.shelfCode}</p>
                  <p className="text-xs text-slate-500">
                    {row.createdAt ? new Date(row.createdAt).toLocaleString() : '—'}
                  </p>
                </div>
                <div className="flex gap-2 text-xs text-slate-600">
                  <span>seen {row.seenCount}</span>
                  <span>missing {row.missingCount}</span>
                </div>
                <Button size="sm" variant="outline" onClick={() => setActiveId(row.id)}>
                  Open
                </Button>
              </li>
            ))}
            {!sessions.data?.length ? (
              <li className="py-4 text-slate-500">No shelf counts yet.</li>
            ) : null}
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}
