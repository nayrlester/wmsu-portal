import type { UsageTrendReport } from '@/types/api'
import { CHART_PALETTE } from './chart-utils'
import { MultiLineChart, type MultiLineSeries } from './multi-line-chart'

const USAGE_SERIES: Array<{
  key: 'users' | 'documents' | 'storage'
  label: string
  color: string
  limitKey: keyof UsageTrendReport['limits']
}> = [
  { key: 'users', label: 'Users', color: CHART_PALETTE.teal, limitKey: 'maxUsers' },
  { key: 'documents', label: 'Documents', color: CHART_PALETTE.slate, limitKey: 'maxDocuments' },
  { key: 'storage', label: 'Storage', color: CHART_PALETTE.indigo, limitKey: 'maxStorageBytes' },
]

export function buildUsageTrendSeries(data: UsageTrendReport): {
  labels: string[]
  series: MultiLineSeries[]
} {
  const labels = data.monthly.map((point) => point.month)

  const series = USAGE_SERIES.filter((config) => data.limits[config.limitKey] !== null).map(
    (config) => ({
      id: config.key,
      label: config.label,
      color: config.color,
      values: data.monthly.map((point) => point[config.key] ?? 0),
    })
  )

  return { labels, series }
}

export interface PlanUsageTrendChartProps {
  data?: UsageTrendReport
  className?: string
}

export function PlanUsageTrendChart({ data, className }: PlanUsageTrendChartProps) {
  if (!data?.monthly.length) {
    return <p className="text-sm text-muted-foreground">No usage history yet.</p>
  }

  const { labels, series } = buildUsageTrendSeries(data)

  if (!series.length) {
    return <p className="text-sm text-muted-foreground">All resources are unlimited on this plan.</p>
  }

  return (
    <MultiLineChart
      labels={labels}
      series={series}
      yMax={100}
      referenceLine={100}
      referenceLineLabel="Plan limit"
      formatValue={(value) => `${Math.round(value)}%`}
      className={className}
    />
  )
}
