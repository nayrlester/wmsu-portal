import { cn } from '@/lib/utils'
import { CHART_SERIES_COLORS } from './chart-utils'

export interface BarChartItem {
  label: string
  value: number
  color?: string
  formattedValue?: string
}

export interface BarChartProps {
  items: BarChartItem[]
  height?: number
  formatValue?: (value: number) => string
  className?: string
  orientation?: 'vertical' | 'horizontal'
}

export function BarChart({
  items,
  height = 192,
  formatValue = (v) => v.toLocaleString(),
  className,
  orientation = 'vertical',
}: BarChartProps) {
  const maxValue = Math.max(...items.map((item) => item.value), 1)

  if (orientation === 'horizontal') {
    return (
      <div className={cn('space-y-3', className)}>
        {items.map((item, index) => {
          const pct = Math.max(2, (item.value / maxValue) * 100)
          const color = item.color ?? CHART_SERIES_COLORS[index % CHART_SERIES_COLORS.length]
          const display = item.formattedValue ?? formatValue(item.value)

          return (
            <div key={item.label}>
              <div className="mb-1.5 flex items-center justify-between gap-2 text-sm">
                <span className="truncate font-medium">{item.label}</span>
                <span className="shrink-0 tabular-nums text-muted-foreground">{display}</span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-muted/80">
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${pct}%`, backgroundColor: color }}
                  role="progressbar"
                  aria-valuenow={item.value}
                  aria-valuemin={0}
                  aria-valuemax={maxValue}
                  aria-label={`${item.label}: ${display}`}
                />
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <div
      className={cn('flex items-end justify-around gap-2 sm:gap-3', className)}
      style={{ height: `clamp(8rem, 24vw, ${height}px)` }}
      role="list"
      aria-label="Bar chart"
    >
      {items.map((item, index) => {
        const pct = Math.max(6, (item.value / maxValue) * 100)
        const color = item.color ?? CHART_SERIES_COLORS[index % CHART_SERIES_COLORS.length]
        const display = item.formattedValue ?? formatValue(item.value)

        return (
          <div key={item.label} className="flex min-w-0 flex-1 flex-col items-center gap-2" role="listitem">
            <span className="text-xs font-semibold tabular-nums text-foreground">{display}</span>
            <div className="flex w-full flex-1 items-end justify-center px-0.5">
              <div
                className="w-full max-w-10 rounded-t-md transition-all sm:max-w-12"
                style={{
                  height: `${pct}%`,
                  minHeight: 6,
                  backgroundColor: color,
                }}
                aria-hidden
              />
            </div>
            <span className="max-w-full truncate text-center text-[11px] text-muted-foreground">
              {item.label}
            </span>
          </div>
        )
      })}
    </div>
  )
}
