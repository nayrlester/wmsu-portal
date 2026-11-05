import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'
import { CHART_PALETTE } from '@/components/shared/charts/chart-utils'

export interface RingSegment {
  label: string
  value: number
  color: string
}

export interface RingChartCardProps {
  title: string
  segments: RingSegment[]
  centerLabel?: string
  centerValue?: string | number
  action?: ReactNode
  loading?: boolean
  className?: string
}

export function RingChartCard({
  title,
  segments,
  centerLabel = 'Total',
  centerValue,
  action,
  loading,
  className,
}: RingChartCardProps) {
  const segmentTotal = segments.reduce((sum, segment) => sum + segment.value, 0)
  const resolvedCenter = centerValue ?? segmentTotal
  const activeSegments = segments.filter((segment) => segment.value > 0)

  let cumulative = 0
  const gradientStops = activeSegments
    .map((segment) => {
      const start = (cumulative / segmentTotal) * 100
      cumulative += segment.value
      const end = (cumulative / segmentTotal) * 100
      return `${segment.color} ${start}% ${end}%`
    })
    .join(', ')

  return (
    <section
      className={cn(
        'overflow-hidden rounded-2xl border border-border/70 bg-card text-card-foreground shadow-sm',
        className
      )}
    >
      <div className="flex items-center justify-between gap-3 border-b border-border/60 px-5 py-4 sm:px-6">
        <h3 className="text-base font-semibold tracking-tight text-foreground sm:text-lg">{title}</h3>
        {action}
      </div>
      <div className="bg-card px-5 py-5 sm:px-6">
        {loading ? (
          <Skeleton className="mx-auto h-36 w-36 rounded-full" />
        ) : (
          <div className="flex flex-col items-center gap-5">
            <div
              className="relative flex h-36 w-36 items-center justify-center rounded-full sm:h-40 sm:w-40"
              style={{
                background:
                  segmentTotal > 0 ? `conic-gradient(${gradientStops})` : 'var(--color-muted)',
                padding: segmentTotal > 0 ? 12 : 0,
              }}
              role="img"
              aria-label={`${title}: ${segments.map((s) => `${s.label} ${s.value}`).join(', ')}`}
            >
              <div className="flex h-[72%] w-[72%] flex-col items-center justify-center rounded-full bg-card text-center">
                <span className="text-2xl font-bold tabular-nums text-foreground">{resolvedCenter}</span>
                <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                  {centerLabel}
                </span>
              </div>
            </div>
            <ul className="flex w-full flex-wrap justify-center gap-2">
              {segments.map((segment) => (
                <li
                  key={segment.label}
                  className="flex items-center gap-1.5 rounded-full border border-border/60 bg-card px-2.5 py-1 text-xs text-muted-foreground"
                >
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: segment.color }}
                    aria-hidden
                  />
                  {segment.label} · <span className="font-medium text-foreground">{segment.value}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  )
}

export const RING_STATUS_COLORS = {
  approved: CHART_PALETTE.teal,
  pending: CHART_PALETTE.amber,
  rejected: CHART_PALETTE.rose,
} as const
