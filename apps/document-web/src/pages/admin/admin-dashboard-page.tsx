import { useQuery } from '@tanstack/react-query'
import { PlatformMetricsGrid } from '@/components/admin/platform-metrics-grid'
import { BarChart, DonutChart, LineChart } from '@/components/shared/charts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { adminApi, formatCurrency } from '@/lib/admin-api'

export function AdminDashboardPage() {
  const { data: overviewData, isLoading: overviewLoading } = useQuery({
    queryKey: ['admin-overview'],
    queryFn: () => adminApi.analyticsOverview().then((r) => r.overview),
  })

  const { data: revenueData, isLoading: revenueLoading } = useQuery({
    queryKey: ['admin-revenue'],
    queryFn: () => adminApi.analyticsRevenue(6),
  })

  const currency = overviewData?.currency ?? 'USD'

  const tenantSegments = overviewData
    ? [
        { label: 'Active', value: overviewData.activeTenants, color: 'var(--color-success)' },
        { label: 'Trialing', value: overviewData.trialingTenants, color: 'var(--color-info)' },
        { label: 'Suspended', value: overviewData.suspendedTenants, color: 'var(--color-error)' },
      ].filter((s) => s.value > 0)
    : []

  const revenueByPlanItems =
    revenueData?.byPlan.map((row, index) => ({
      label: row.planName,
      value: row.mrr,
      formattedValue: `${formatCurrency(row.mrr, currency)}/mo · ${row.tenantCount} tenants`,
      color: ['var(--color-primary)', 'var(--color-success)', 'var(--color-info)', 'var(--color-warning)'][
        index % 4
      ],
    })) ?? []

  const monthlyPoints =
    revenueData?.monthly.map((point) => ({
      label: point.month,
      value: point.revenue,
    })) ?? []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Revenue Dashboard</h1>
        <p className="text-muted-foreground">Platform-wide SaaS metrics and growth indicators</p>
      </div>

      <PlatformMetricsGrid overview={overviewData} isLoading={overviewLoading} />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Monthly Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            {revenueLoading ? (
              <Skeleton className="h-40 w-full sm:h-48" />
            ) : monthlyPoints.length ? (
              <LineChart
                points={monthlyPoints}
                height={160}
                formatValue={(v) => formatCurrency(v, currency)}
              />
            ) : (
              <p className="text-sm text-muted-foreground">No revenue recorded yet.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Tenant Status</CardTitle>
          </CardHeader>
          <CardContent>
            {overviewLoading ? (
              <Skeleton className="mx-auto h-24 w-24 rounded-full sm:h-28 sm:w-28" />
            ) : tenantSegments.length ? (
              <DonutChart
                segments={tenantSegments}
                centerLabel="Total"
                centerValue={overviewData?.totalTenants ?? 0}
              />
            ) : (
              <p className="text-center text-sm text-muted-foreground">No tenants yet.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Revenue by Plan</CardTitle>
          </CardHeader>
          <CardContent>
            {revenueLoading ? (
              <Skeleton className="h-40 w-full" />
            ) : revenueByPlanItems.length ? (
              <BarChart
                items={revenueByPlanItems}
                orientation="horizontal"
                formatValue={(v) => formatCurrency(v, currency)}
              />
            ) : (
              <p className="text-sm text-muted-foreground">No active subscriptions yet.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>MRR by Plan</CardTitle>
          </CardHeader>
          <CardContent>
            {revenueLoading ? (
              <Skeleton className="h-28 w-full sm:h-36" />
            ) : revenueByPlanItems.length ? (
              <BarChart
                items={revenueByPlanItems.map((item) => ({
                  label: item.label,
                  value: item.value,
                  color: item.color,
                  formattedValue: formatCurrency(item.value, currency),
                }))}
                height={176}
                formatValue={(v) => formatCurrency(v, currency)}
              />
            ) : (
              <p className="text-sm text-muted-foreground">No active subscriptions yet.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
