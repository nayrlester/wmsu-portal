import { useId } from 'react'
import { cn } from '@/lib/utils'
import {
  buildSmoothAreaPath,
  buildSmoothLinePath,
  CHART_PADDING,
  pointX,
} from './chart-utils'
import { useChartWidth } from './use-chart-width'

export interface MultiLineSeries {
  id: string
  label: string
  color: string
  values: number[]
}

export interface MultiLineChartProps {
  labels: string[]
  series: MultiLineSeries[]
  height?: number
  formatValue?: (value: number) => string
  yMax?: number
  referenceLine?: number
  referenceLineLabel?: string
  className?: string
}

export function MultiLineChart({
  labels,
  series,
  height = 200,
  formatValue = (v) => `${v}%`,
  yMax = 100,
  referenceLine,
  referenceLineLabel,
  className,
}: MultiLineChartProps) {
  const gradientPrefix = useId().replace(/:/g, '')
  const { ref, width: viewWidth } = useChartWidth()

  if (!labels.length || !series.length) {
    return <p className="text-sm text-muted-foreground">No usage data available.</p>
  }

  const chartWidth = viewWidth - CHART_PADDING.left - CHART_PADDING.right
  const chartHeight = height - CHART_PADDING.top - CHART_PADDING.bottom
  const maxValue = Math.max(yMax, referenceLine ?? 0, ...series.flatMap((line) => line.values), 1)
  const baselineY = CHART_PADDING.top + chartHeight

  const valueToY = (value: number) => CHART_PADDING.top + chartHeight - (value / maxValue) * chartHeight
  const yTicks = [0, 0.5, 1].map((ratio) => ({ ratio, value: maxValue * ratio }))

  const ariaLabel = series
    .map((line) => `${line.label}: ${labels.map((label, i) => `${label} ${formatValue(line.values[i] ?? 0)}`).join(', ')}`)
    .join('; ')

  return (
    <div ref={ref} className={cn('w-full', className)}>
      <svg
        viewBox={`0 0 ${viewWidth} ${height}`}
        className="h-48 w-full sm:h-56 md:h-64"
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label={ariaLabel}
      >
        <defs>
          {series.map((line) => (
            <linearGradient key={line.id} id={`${gradientPrefix}-${line.id}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={line.color} stopOpacity="0.15" />
              <stop offset="100%" stopColor={line.color} stopOpacity="0.02" />
            </linearGradient>
          ))}
        </defs>

        {yTicks.map(({ ratio, value }) => {
          const y = CHART_PADDING.top + chartHeight * (1 - ratio)
          return (
            <g key={ratio}>
              <line
                x1={CHART_PADDING.left}
                y1={y}
                x2={viewWidth - CHART_PADDING.right}
                y2={y}
                stroke="var(--color-border)"
                strokeWidth="1"
                strokeOpacity="0.5"
              />
              <text
                x={CHART_PADDING.left - 10}
                y={y + 4}
                textAnchor="end"
                className="fill-muted-foreground text-[10px]"
              >
                {formatValue(value)}
              </text>
            </g>
          )
        })}

        {referenceLine !== undefined && referenceLine <= maxValue && (
          <line
            x1={CHART_PADDING.left}
            y1={valueToY(referenceLine)}
            x2={viewWidth - CHART_PADDING.right}
            y2={valueToY(referenceLine)}
            stroke="#B45309"
            strokeWidth="1.5"
            strokeDasharray="5 4"
            strokeOpacity="0.75"
          />
        )}

        {series.map((line) => {
          const coords = labels.map((label, index) => ({
            label,
            value: line.values[index] ?? 0,
            x: pointX(index, labels.length, chartWidth),
            y: valueToY(line.values[index] ?? 0),
          }))

          const linePath = buildSmoothLinePath(coords)
          const areaPath = buildSmoothAreaPath(coords, baselineY)

          return (
            <g key={line.id}>
              <path d={areaPath} fill={`url(#${gradientPrefix}-${line.id})`} />
              <path
                d={linePath}
                fill="none"
                stroke={line.color}
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {coords.map((point) => (
                <g key={`${line.id}-${point.label}`}>
                  <circle
                    cx={point.x}
                    cy={point.y}
                    r="3.5"
                    fill="var(--color-card)"
                    stroke={line.color}
                    strokeWidth="2"
                  />
                  <title>{`${line.label} · ${point.label}: ${formatValue(point.value)}`}</title>
                </g>
              ))}
            </g>
          )
        })}

        {labels.map((label, index) => (
          <text
            key={label}
            x={pointX(index, labels.length, chartWidth)}
            y={height - 10}
            textAnchor="middle"
            className="fill-muted-foreground text-[10px] sm:text-[11px]"
          >
            {label}
          </text>
        ))}
      </svg>

      <ul className="mt-3 flex flex-wrap justify-center gap-2">
        {series.map((line) => (
          <li
            key={line.id}
            className="flex items-center gap-1.5 rounded-full border border-border/60 bg-card px-3 py-1 text-xs text-muted-foreground"
          >
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: line.color }} aria-hidden />
            {line.label}
          </li>
        ))}
        {referenceLineLabel && (
          <li className="flex items-center gap-1.5 rounded-full bg-muted/50 px-3 py-1 text-xs text-muted-foreground">
            <span className="inline-block w-4 border-t-2 border-dashed border-amber-700/70" aria-hidden />
            {referenceLineLabel}
          </li>
        )}
      </ul>
    </div>
  )
}
