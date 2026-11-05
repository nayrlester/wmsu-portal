import { FileText, Clock, CheckCircle, XCircle, BarChart3, Download } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { PageHeader, StatCard } from '@/components/shared/page-header'
import { BarChart, CHART_PALETTE, DONUT_STATUS_COLORS, DonutChart } from '@/components/shared/charts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { useDashboardStats, useSubscriptionUsage } from '@/hooks/use-api'
import { formatBytes, formatPercent } from '@/lib/utils'
import { apiClient } from '@/api/client'
import { apiRequest } from '@/api/utils/request'
import { UdmsReportsPanel } from '@/features/documents/components/udms-reports-panel'

const USAGE_BAR_COLORS: Record<string, string> = {
  Users: CHART_PALETTE.teal,
  Documents: CHART_PALETTE.slate,
  Storage: CHART_PALETTE.indigo,
}

type OpsReport = {
  generatedAt: string
  sla: { open: number; breached: number }
  digitization: {
    itemsTotal: number
    qaPassed: number
    qaFailed: number
    avgOcrConfidence: number | null
    lowConfidenceCount: number
  }
  scan: { pagesIngested: number; duplicateHashes: number }
}

export function ReportsPage() {
  const { data: stats, isLoading: statsLoading } = useDashboardStats()
  const { data: usage, isLoading: usageLoading } = useSubscriptionUsage()
  const { data: ops, isLoading: opsLoading } = useQuery({
    queryKey: ['ops-report'],
    queryFn: () => apiRequest<OpsReport>(apiClient.get('/account/records/ops-report')),
  })

  const usageItems = usage
    ? [
        { label: 'Users', used: usage.usage.users, max: usage.limits.maxUsers },
        { label: 'Documents', used: usage.usage.documents, max: usage.limits.maxDocuments },
        {
          label: 'Storage',
          used: usage.usage.storageBytes,
          max: usage.limits.maxStorageBytes,
          format: formatBytes,
        },
      ]
    : []

  const documentSegments = [
    { label: 'Approved', value: stats?.approvedDocuments ?? 0, color: DONUT_STATUS_COLORS.approved },
    { label: 'Pending', value: stats?.pendingDocuments ?? 0, color: DONUT_STATUS_COLORS.pending },
    { label: 'Rejected', value: stats?.rejectedDocuments ?? 0, color: DONUT_STATUS_COLORS.rejected },
  ]

  const documentBarItems = [
    { label: 'Total', value: stats?.totalDocuments ?? 0, color: CHART_PALETTE.primary },
    { label: 'Pending', value: stats?.pendingDocuments ?? 0, color: CHART_PALETTE.amber },
    { label: 'Approved', value: stats?.approvedDocuments ?? 0, color: CHART_PALETTE.teal },
    { label: 'Rejected', value: stats?.rejectedDocuments ?? 0, color: CHART_PALETTE.rose },
  ]

  const unlimitedUsageItems = usageItems.filter((item) => item.max === null)

  return (
    <div className="space-y-6 sm:space-y-8">
      <PageHeader
        title="Reports"
        description="UDMS management dashboard, document metrics, plan usage, and operations KPIs"
        action={
          <Button
            variant="outline"
            onClick={async () => {
              try {
                const res = await apiClient.get('/account/records/ops-report', {
                  params: { format: 'csv' },
                  responseType: 'blob',
                })
                const blob = new Blob([res.data], { type: 'text/csv;charset=utf-8' })
                const url = URL.createObjectURL(blob)
                const a = document.createElement('a')
                a.href = url
                a.download = 'ops-report.csv'
                a.click()
                URL.revokeObjectURL(url)
              } catch {
                // toast handled by interceptor if any
              }
            }}
          >
            <Download className="mr-1 h-4 w-4" />
            Export ops CSV
          </Button>
        }
      />

      <UdmsReportsPanel />

      <section aria-labelledby="ops-metrics-heading">
        <h2 id="ops-metrics-heading" className="mb-3 text-base font-semibold sm:mb-4 sm:text-lg">
          Operations pack
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          <StatCard
            label="SLA open"
            value={ops?.sla.open ?? 0}
            icon={Clock}
            loading={opsLoading}
          />
          <StatCard
            label="SLA breached"
            value={ops?.sla.breached ?? 0}
            icon={XCircle}
            accent="text-red-600"
            loading={opsLoading}
          />
          <StatCard
            label="Pages scanned"
            value={ops?.scan.pagesIngested ?? 0}
            icon={FileText}
            loading={opsLoading}
          />
          <StatCard
            label="Avg OCR %"
            value={
              ops?.digitization.avgOcrConfidence == null
                ? 0
                : Math.round(ops.digitization.avgOcrConfidence * 100)
            }
            icon={CheckCircle}
            accent="text-emerald-600"
            loading={opsLoading}
          />
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Digitization QA passed {ops?.digitization.qaPassed ?? 0} / failed{' '}
          {ops?.digitization.qaFailed ?? 0} · low-confidence items{' '}
          {ops?.digitization.lowConfidenceCount ?? 0} · duplicate hashes{' '}
          {ops?.scan.duplicateHashes ?? 0}
        </p>
      </section>

      <section aria-labelledby="doc-metrics-heading">
        <h2 id="doc-metrics-heading" className="mb-3 text-base font-semibold sm:mb-4 sm:text-lg">
          Document metrics
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          <StatCard label="Total" value={stats?.totalDocuments ?? 0} icon={FileText} loading={statsLoading} />
          <StatCard label="Pending" value={stats?.pendingDocuments ?? 0} icon={Clock} accent="text-amber-600" loading={statsLoading} />
          <StatCard label="Approved" value={stats?.approvedDocuments ?? 0} icon={CheckCircle} accent="text-emerald-600" loading={statsLoading} />
          <StatCard label="Rejected" value={stats?.rejectedDocuments ?? 0} icon={XCircle} accent="text-red-600" loading={statsLoading} />
        </div>
      </section>

      <section aria-labelledby="doc-charts-heading" className="grid gap-4 sm:gap-6 lg:grid-cols-2">
        <h2 id="doc-charts-heading" className="sr-only">
          Document charts
        </h2>
        <Card>
          <CardHeader className="pb-2 sm:pb-4">
            <CardTitle className="text-base sm:text-lg">Status breakdown</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 sm:pt-2">
            {statsLoading ? (
              <Skeleton className="mx-auto h-24 w-24 rounded-full sm:h-28 sm:w-28" />
            ) : documentSegments.some((s) => s.value > 0) ? (
              <DonutChart
                segments={documentSegments.filter((s) => s.value > 0)}
                centerLabel="Total"
                centerValue={stats?.totalDocuments ?? 0}
              />
            ) : (
              <p className="text-center text-sm text-muted-foreground">No documents yet.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 sm:pb-4">
            <CardTitle className="text-base sm:text-lg">Volume by status</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 sm:pt-2">
            {statsLoading ? (
              <Skeleton className="h-28 w-full sm:h-36" />
            ) : (
              <BarChart items={documentBarItems} height={176} />
            )}
          </CardContent>
        </Card>
      </section>

      <section aria-labelledby="plan-usage-heading">
        <Card>
          <CardHeader className="pb-2 sm:pb-4">
            <CardTitle
              id="plan-usage-heading"
              className="flex flex-wrap items-center gap-x-2 gap-y-1 text-base sm:text-lg"
            >
              <BarChart3 className="h-4 w-4 shrink-0 sm:h-5 sm:w-5" aria-hidden />
              <span>
                Plan usage — {usageLoading ? '…' : usage?.plan.name ?? 'Current plan'}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5 pt-0 sm:space-y-6 sm:pt-2">
            {usageLoading ? (
              <Skeleton className="h-32 w-full" />
            ) : (
              usageItems.map((item) => {
                const displayUsed = item.format ? item.format(item.used) : item.used.toLocaleString()
                const displayMax =
                  item.max === null
                    ? 'Unlimited'
                    : item.format
                      ? item.format(item.max)
                      : item.max.toLocaleString()
                const pct =
                  item.max === null ? 0 : Math.min(100, Math.round((item.used / item.max) * 100))
                const barColor = USAGE_BAR_COLORS[item.label] ?? CHART_PALETTE.primary

                return (
                  <div key={item.label}>
                    <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5 text-sm">
                      <span className="font-medium">{item.label}</span>
                      <span className="text-muted-foreground">
                        {displayUsed} / {displayMax}
                        {item.max !== null && ` (${formatPercent(item.used, item.max)})`}
                      </span>
                    </div>
                    {item.max !== null ? (
                      <div className="h-2.5 overflow-hidden rounded-full bg-muted/80">
                        <div
                          className="h-full rounded-full transition-all duration-300"
                          style={{ width: `${Math.max(pct, pct > 0 ? 2 : 0)}%`, backgroundColor: barColor }}
                          role="progressbar"
                          aria-valuenow={pct}
                          aria-valuemin={0}
                          aria-valuemax={100}
                          aria-label={`${item.label} usage`}
                        />
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">Unlimited on current plan</p>
                    )}
                  </div>
                )
              })
            )}

            {unlimitedUsageItems.length > 0 && unlimitedUsageItems.length < usageItems.length && (
              <p className="text-[11px] text-muted-foreground sm:text-xs">
                {unlimitedUsageItems.map((i) => i.label).join(', ')} — unlimited on current plan.
              </p>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
