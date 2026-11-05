import { cn } from '@/lib/utils'
import { CHART_PALETTE } from './chart-utils'

export interface DonutSegment {
  label: string
  value: number
  color: string
}

export interface DonutChartProps {
  segments: DonutSegment[]
  centerLabel?: string
  centerValue?: string | number
  size?: number
  className?: string
  compact?: boolean
}

export function DonutChart({
  segments,
  centerLabel = 'Total',
  centerValue,
  size,
  className,
  compact = false,
}: DonutChartProps) {
  const segmentTotal = segments.reduce((sum, segment) => sum + segment.value, 0)
  const resolvedCenter = centerValue ?? segmentTotal
  const useResponsive = size === undefined
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

  const resolvedSize = size ?? (compact ? 112 : 144)

  return (
    <div className={cn('flex flex-col items-center gap-3 sm:gap-4', className)}>
      <div
        className={cn(
          'relative flex items-center justify-center rounded-full',
          useResponsive && 'h-28 w-28 sm:h-32 sm:w-32 md:h-36 md:w-36'
        )}
        style={{
          ...(useResponsive ? {} : { width: resolvedSize, height: resolvedSize }),
          background: segmentTotal > 0 ? `conic-gradient(${gradientStops})` : 'var(--color-muted)',
          padding: segmentTotal > 0 ? 10 : 0,
        }}
        role="img"
        aria-label={`${segments.map((s) => `${s.label} ${s.value}`).join(', ')}`}
      >
        <div
          className={cn(
            'flex flex-col items-center justify-center rounded-full bg-card text-center',
            useResponsive && 'h-[72%] w-[72%]'
          )}
          style={useResponsive ? undefined : { width: Math.round(resolvedSize * 0.67), height: Math.round(resolvedSize * 0.67) }}
        >
          <span className="text-xl font-bold tabular-nums text-foreground sm:text-2xl">{resolvedCenter}</span>
          <span className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground sm:text-[10px]">
            {centerLabel}
          </span>
        </div>
      </div>
      <ul className="flex w-full flex-wrap justify-center gap-2">
        {segments.map((segment) => (
          <li
            key={segment.label}
            className="flex items-center gap-1.5 rounded-full border border-border/60 bg-card px-2.5 py-1 text-[11px] text-muted-foreground sm:text-xs"
          >
            <span
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ backgroundColor: segment.color }}
              aria-hidden
            />
            <span>
              {segment.label} · <span className="font-medium text-foreground">{segment.value}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export const DONUT_STATUS_COLORS = {
  approved: CHART_PALETTE.teal,
  pending: CHART_PALETTE.amber,
  rejected: CHART_PALETTE.rose,
} as const
