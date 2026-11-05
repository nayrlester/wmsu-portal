import { cn } from '@/lib/utils'
import type { DashboardFilesTrendPoint } from '@/types/api'
import {
  DASHBOARD_TREND_CHART_HEIGHT,
  DASHBOARD_TREND_CHART_SVG_CLASS,
  DASHBOARD_TREND_LEGEND_SPACER_CLASS,
} from './chart-utils'
import { LineChart } from './line-chart'

export interface DailyFilesTrendChartProps {
  points: DashboardFilesTrendPoint[]
  className?: string
}

export function DailyFilesTrendChart({ points, className }: DailyFilesTrendChartProps) {
  const chartPoints = points.map((point) => ({
    label: formatDayLabel(point.day),
    value: point.count,
  }))

  return (
    <div className={cn('w-full', className)}>
      <div className={DASHBOARD_TREND_LEGEND_SPACER_CLASS} aria-hidden />
      <LineChart
        points={chartPoints}
        height={DASHBOARD_TREND_CHART_HEIGHT}
        svgClassName={DASHBOARD_TREND_CHART_SVG_CLASS}
        maxXLabels={6}
        strokeColor="#14B8A6"
        formatValue={(value) => `${value} file${value === 1 ? '' : 's'}`}
      />
    </div>
  )
}

function formatDayLabel(day: string): string {
  const date = new Date(`${day}T00:00:00`)
  if (Number.isNaN(date.getTime())) return day
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}
