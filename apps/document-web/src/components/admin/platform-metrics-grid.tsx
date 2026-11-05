import type { ComponentType } from 'react'
import { DollarSign, TrendingUp, Users, HardDrive, Percent, Building2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatBytes, formatCurrency } from '@/lib/admin-api'
import type { PlatformOverview } from '@/lib/admin-api'

interface MetricCardProps {
  label: string
  value: string
  hint?: string
  icon: ComponentType<{ className?: string }>
  accent?: string
}

function MetricCard({ label, value, hint, icon: Icon, accent = 'text-primary' }: MetricCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
        <Icon className={`h-4 w-4 ${accent}`} />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
      </CardContent>
    </Card>
  )
}

interface Props {
  overview?: PlatformOverview
  isLoading?: boolean
}

export function PlatformMetricsGrid({ overview, isLoading }: Props) {
  if (isLoading || !overview) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="pt-6">
              <div className="h-8 animate-pulse rounded bg-muted" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      <MetricCard
        label="MRR"
        value={formatCurrency(overview.mrr, overview.currency)}
        hint="Monthly recurring revenue"
        icon={DollarSign}
        accent="text-emerald-600"
      />
      <MetricCard
        label="ARR"
        value={formatCurrency(overview.arr, overview.currency)}
        hint="Annual run rate"
        icon={TrendingUp}
        accent="text-blue-600"
      />
      <MetricCard
        label="Churn"
        value={`${overview.churnRate}%`}
        hint="This month"
        icon={Percent}
        accent="text-orange-600"
      />
      <MetricCard
        label="Active Tenants"
        value={String(overview.activeTenants)}
        hint={`${overview.trialingTenants} trialing`}
        icon={Building2}
        accent="text-violet-600"
      />
      <MetricCard
        label="Total Tenants"
        value={String(overview.totalTenants)}
        hint={`${overview.suspendedTenants} suspended`}
        icon={Users}
      />
      <MetricCard
        label="Storage"
        value={formatBytes(overview.storageBytes)}
        hint="Platform-wide usage"
        icon={HardDrive}
        accent="text-cyan-600"
      />
    </div>
  )
}
