import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Archive, Clock, Download, FileText, Printer, Users } from 'lucide-react'
import { udmsApi } from '@/api/modules/udms.api'
import { BarChart, CHART_PALETTE, DONUT_STATUS_COLORS, DonutChart } from '@/components/shared/charts'
import { StatCard } from '@/components/shared/page-header'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { formatDate } from '@/lib/utils'

function toDateInput(iso?: string) {
  if (!iso) return ''
  return iso.slice(0, 10)
}

function metricDisplay(value: number | null | undefined) {
  if (value === null || value === undefined) return 'n/a'
  return value
}

function distributionItems(
  map: Record<string, number> | undefined,
  color: (typeof CHART_PALETTE)[keyof typeof CHART_PALETTE] = CHART_PALETTE.primary
) {
  if (!map) return []
  return Object.entries(map)
    .filter(([, value]) => value > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)
    .map(([label, value]) => ({ label, value, color }))
}

export function UdmsReportsPanel() {
  const today = new Date()
  const defaultTo = today.toISOString().slice(0, 10)
  const defaultFrom = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10)

  const [from, setFrom] = useState(defaultFrom)
  const [to, setTo] = useState(defaultTo)
  const [applied, setApplied] = useState({ from: defaultFrom, to: defaultTo })
  const [tab, setTab] = useState<'overview' | 'registration' | 'workflow' | 'archival'>('overview')

  const filters = useMemo(
    () => ({
      from: applied.from ? new Date(`${applied.from}T00:00:00.000Z`).toISOString() : undefined,
      to: applied.to ? new Date(`${applied.to}T23:59:59.999Z`).toISOString() : undefined,
    }),
    [applied]
  )

  const dashboardQuery = useQuery({
    queryKey: ['udms-reports-dashboard', filters],
    queryFn: () => udmsApi.getReportsDashboard(filters),
  })

  const registrationQuery = useQuery({
    queryKey: ['udms-reports-registration', filters],
    queryFn: () => udmsApi.getRegistrationReport({ ...filters, page: 1, limit: 25 }),
    enabled: tab === 'registration',
  })

  const workflowQuery = useQuery({
    queryKey: ['udms-reports-workflow', filters],
    queryFn: () => udmsApi.getWorkflowReport(filters),
    enabled: tab === 'workflow',
  })

  const archivalQuery = useQuery({
    queryKey: ['udms-reports-archival', filters],
    queryFn: () => udmsApi.getArchivalReport({ ...filters, page: 1, limit: 25 }),
    enabled: tab === 'archival',
  })

  const dashboard = dashboardQuery.data
  const metrics = dashboard?.metrics ?? {}
  const statusItems = distributionItems(dashboard?.distributions.byStatus)
  const napItems = distributionItems(dashboard?.distributions.byNapCategory, CHART_PALETTE.teal)
  const trendItems = (dashboard?.registrationTrend ?? []).map((row) => ({
    label: row.day.slice(5),
    value: row.total,
    color: CHART_PALETTE.indigo,
  }))

  const statusDonut = Object.entries(dashboard?.distributions.byStatus ?? {})
    .filter(([, value]) => value > 0)
    .map(([label, value]) => ({
      label,
      value,
      color: DONUT_STATUS_COLORS[label as keyof typeof DONUT_STATUS_COLORS] ?? CHART_PALETTE.slate,
    }))

  return (
    <section aria-labelledby="udms-reports-heading" className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 id="udms-reports-heading" className="text-base font-semibold sm:text-lg">
            UDMS management dashboard
          </h2>
          <p className="text-sm text-muted-foreground">
            Metrics calculated from live document, routing, approval, retention, and record-request
            records. No invented SLA targets.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => udmsApi.downloadReportCsv('dashboard', filters)}
          >
            <Download className="mr-1 h-4 w-4" />
            Export CSV
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => udmsApi.openPrintableReport(filters)}
          >
            <Printer className="mr-1 h-4 w-4" />
            Print / PDF
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="grid gap-3 pt-4 sm:grid-cols-4">
          <div className="space-y-1.5">
            <Label htmlFor="udms-report-from">From</Label>
            <Input
              id="udms-report-from"
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="udms-report-to">To</Label>
            <Input
              id="udms-report-to"
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
          </div>
          <div className="flex items-end sm:col-span-2">
            <Button
              onClick={() => setApplied({ from, to })}
              className="w-full sm:w-auto"
            >
              Apply period
            </Button>
          </div>
        </CardContent>
      </Card>

      {dashboardQuery.isError ? (
        <p className="text-sm text-destructive">Unable to load UDMS reports for this account.</p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {(
          [
            ['overview', 'Overview'],
            ['registration', 'Registration'],
            ['workflow', 'Tracking / workflow'],
            ['archival', 'Archival / retention'],
          ] as const
        ).map(([id, label]) => (
          <Button
            key={id}
            size="sm"
            variant={tab === id ? 'default' : 'outline'}
            onClick={() => setTab(id)}
          >
            {label}
          </Button>
        ))}
      </div>

      {tab === 'overview' ? (
        <div className="space-y-4">
          <p className="text-xs text-muted-foreground">
            Period {toDateInput(dashboard?.period.from)} — {toDateInput(dashboard?.period.to)}
            {dashboard?.generatedAt ? ` · generated ${formatDate(dashboard.generatedAt)}` : ''}
          </p>
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            <StatCard
              label="Total documents"
              value={metricDisplay(metrics.totalDocuments as number | null)}
              icon={FileText}
              loading={dashboardQuery.isLoading}
            />
            <StatCard
              label="Registered in period"
              value={metricDisplay(metrics.registeredInPeriod as number | null)}
              icon={FileText}
              loading={dashboardQuery.isLoading}
            />
            <StatCard
              label="Awaiting action"
              value={metricDisplay(metrics.awaitingAction as number | null)}
              icon={Clock}
              accent="text-amber-600"
              loading={dashboardQuery.isLoading}
              hint="Status-based queue, not SLA overdue"
            />
            <StatCard
              label="Currently assigned"
              value={metricDisplay(metrics.currentlyAssigned as number | null)}
              icon={Users}
              loading={dashboardQuery.isLoading}
            />
            <StatCard
              label="Archived"
              value={metricDisplay(metrics.archivedDocuments as number | null)}
              icon={Archive}
              loading={dashboardQuery.isLoading}
            />
            <StatCard
              label="Retention due"
              value={metricDisplay(metrics.retentionDue as number | null)}
              icon={Clock}
              accent="text-amber-600"
              loading={dashboardQuery.isLoading}
              hint="Uses configured retention_due_at only"
            />
            <StatCard
              label="Pending record requests"
              value={metricDisplay(metrics.pendingRecordRequests as number | null)}
              icon={FileText}
              loading={dashboardQuery.isLoading}
            />
            <StatCard
              label="Avg request hours"
              value={metricDisplay(metrics.averageRecordRequestProcessingHours as number | null)}
              icon={Clock}
              loading={dashboardQuery.isLoading}
              hint="n/a when no released samples"
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Status distribution</CardTitle>
              </CardHeader>
              <CardContent>
                {dashboardQuery.isLoading ? (
                  <Skeleton className="mx-auto h-28 w-28 rounded-full" />
                ) : statusDonut.length ? (
                  <DonutChart
                    segments={statusDonut}
                    centerLabel="Docs"
                    centerValue={Number(metrics.totalDocuments ?? 0)}
                  />
                ) : (
                  <p className="text-center text-sm text-muted-foreground">No documents in scope.</p>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Registration trend</CardTitle>
              </CardHeader>
              <CardContent>
                {dashboardQuery.isLoading ? (
                  <Skeleton className="h-36 w-full" />
                ) : trendItems.length ? (
                  <BarChart items={trendItems} height={176} />
                ) : (
                  <p className="text-center text-sm text-muted-foreground">
                    No registrations in the selected period.
                  </p>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">By NAP category</CardTitle>
              </CardHeader>
              <CardContent>
                {napItems.length ? (
                  <BarChart items={napItems} height={176} />
                ) : (
                  <p className="text-center text-sm text-muted-foreground">
                    No NAP category values recorded.
                  </p>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">By status (bars)</CardTitle>
              </CardHeader>
              <CardContent>
                {statusItems.length ? (
                  <BarChart items={statusItems} height={176} />
                ) : (
                  <p className="text-center text-sm text-muted-foreground">No status counts.</p>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Recent document activity</CardTitle>
            </CardHeader>
            <CardContent>
              {(dashboard?.recentActivity ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground">No recent activity.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-muted-foreground">
                        <th className="py-2 pr-3 font-medium">Tracking</th>
                        <th className="py-2 pr-3 font-medium">Title</th>
                        <th className="py-2 pr-3 font-medium">Status</th>
                        <th className="py-2 font-medium">Updated</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dashboard?.recentActivity.map((row) => (
                        <tr key={row.id} className="border-b last:border-0">
                          <td className="py-2 pr-3">
                            <Link className="underline" to={`/app/documents/${row.id}`}>
                              {row.trackingNumber}
                            </Link>
                          </td>
                          <td className="py-2 pr-3">{row.title}</td>
                          <td className="py-2 pr-3 capitalize">
                            {row.status.replaceAll('_', ' ')}
                          </td>
                          <td className="py-2">{formatDate(row.updatedAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      ) : null}

      {tab === 'registration' ? (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button
              size="sm"
              variant="outline"
              onClick={() => udmsApi.downloadReportCsv('registration', filters)}
            >
              <Download className="mr-1 h-4 w-4" />
              Export registration CSV
            </Button>
          </div>
          {registrationQuery.isLoading ? <Skeleton className="h-40 w-full" /> : null}
          {registrationQuery.isError ? (
            <p className="text-sm text-destructive">Unable to load registration report.</p>
          ) : null}
          {registrationQuery.data ? (
            <>
              <div className="grid gap-4 lg:grid-cols-2">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">By department</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {distributionItems(registrationQuery.data.aggregates.byDepartmentId).length ? (
                      <BarChart
                        items={distributionItems(registrationQuery.data.aggregates.byDepartmentId)}
                        height={160}
                      />
                    ) : (
                      <p className="text-center text-sm text-muted-foreground">No department data.</p>
                    )}
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">By NAP category</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {distributionItems(registrationQuery.data.aggregates.byNapCategory).length ? (
                      <BarChart
                        items={distributionItems(
                          registrationQuery.data.aggregates.byNapCategory,
                          CHART_PALETTE.teal
                        )}
                        height={160}
                      />
                    ) : (
                      <p className="text-center text-sm text-muted-foreground">No NAP category data.</p>
                    )}
                  </CardContent>
                </Card>
              </div>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Registered documents</CardTitle>
                </CardHeader>
                <CardContent>
                  {registrationQuery.data.data.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No registrations in period.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b text-left text-muted-foreground">
                            <th className="py-2 pr-3 font-medium">Tracking</th>
                            <th className="py-2 pr-3 font-medium">Title</th>
                            <th className="py-2 pr-3 font-medium">Status</th>
                            <th className="py-2 font-medium">NAP</th>
                          </tr>
                        </thead>
                        <tbody>
                          {registrationQuery.data.data.map((doc) => (
                            <tr key={doc.id} className="border-b last:border-0">
                              <td className="py-2 pr-3">
                                <Link className="underline" to={`/app/documents/${doc.id}`}>
                                  {doc.trackingNumber}
                                </Link>
                              </td>
                              <td className="py-2 pr-3">{doc.title}</td>
                              <td className="py-2 pr-3 capitalize">
                                {doc.status.replaceAll('_', ' ')}
                              </td>
                              <td className="py-2">{doc.napCategory ?? '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          ) : null}
        </div>
      ) : null}

      {tab === 'workflow' ? (
        <div className="space-y-4">
          {workflowQuery.isLoading ? <Skeleton className="h-40 w-full" /> : null}
          {workflowQuery.data ? (
            <>
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <StatCard
                  label="Assigned now"
                  value={workflowQuery.data.metrics.currentlyAssigned}
                  icon={Users}
                />
                <StatCard
                  label="Awaiting action"
                  value={workflowQuery.data.metrics.awaitingAction}
                  icon={Clock}
                  accent="text-amber-600"
                />
                <StatCard
                  label="Routing events"
                  value={workflowQuery.data.metrics.routingEventsInPeriod}
                  icon={FileText}
                />
                <StatCard
                  label="Approval actions"
                  value={workflowQuery.data.metrics.approvalActionsInPeriod}
                  icon={FileText}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                {workflowQuery.data.policyNotes.assignmentIsNotReceipt}
              </p>
              <div className="grid gap-4 lg:grid-cols-2">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Routing by action</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <BarChart
                      items={distributionItems(workflowQuery.data.distributions.routingByAction)}
                      height={160}
                    />
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Approvals by action</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <BarChart
                      items={distributionItems(
                        workflowQuery.data.distributions.approvalsByAction,
                        CHART_PALETTE.teal
                      )}
                      height={160}
                    />
                  </CardContent>
                </Card>
              </div>
            </>
          ) : null}
        </div>
      ) : null}

      {tab === 'archival' ? (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button
              size="sm"
              variant="outline"
              onClick={() => udmsApi.downloadReportCsv('archival', filters)}
            >
              <Download className="mr-1 h-4 w-4" />
              Export archival CSV
            </Button>
          </div>
          {archivalQuery.isLoading ? <Skeleton className="h-40 w-full" /> : null}
          {archivalQuery.isError ? (
            <p className="text-sm text-destructive">Unable to load archival report.</p>
          ) : null}
          {archivalQuery.data ? (
            <>
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <StatCard
                  label="Archived total"
                  value={archivalQuery.data.metrics.archivedDocuments}
                  icon={Archive}
                />
                <StatCard
                  label="Archived in period"
                  value={archivalQuery.data.metrics.archivedInPeriod}
                  icon={Archive}
                />
                <StatCard
                  label="With retention"
                  value={archivalQuery.data.metrics.withRetentionSchedule}
                  icon={FileText}
                />
                <StatCard
                  label="Missing retention"
                  value={archivalQuery.data.metrics.missingRetentionSchedule}
                  icon={Clock}
                  hint="Missing schedule, not expired"
                />
              </div>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Archived inventory</CardTitle>
                </CardHeader>
                <CardContent>
                  {archivalQuery.data.data.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No archived documents.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b text-left text-muted-foreground">
                            <th className="py-2 pr-3 font-medium">Tracking</th>
                            <th className="py-2 pr-3 font-medium">Title</th>
                            <th className="py-2 pr-3 font-medium">Lifecycle</th>
                            <th className="py-2 font-medium">Retention due</th>
                          </tr>
                        </thead>
                        <tbody>
                          {archivalQuery.data.data.map((doc) => (
                            <tr key={doc.id} className="border-b last:border-0">
                              <td className="py-2 pr-3">
                                <Link className="underline" to={`/app/documents/${doc.id}`}>
                                  {doc.trackingNumber}
                                </Link>
                              </td>
                              <td className="py-2 pr-3">{doc.title}</td>
                              <td className="py-2 pr-3">{doc.lifecycleStatus ?? '—'}</td>
                              <td className="py-2">
                                {doc.retentionDueAt ? formatDate(String(doc.retentionDueAt)) : '—'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          ) : null}
        </div>
      ) : null}
    </section>
  )
}
