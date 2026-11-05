import { useId } from 'react'
import { cn } from '@/lib/utils'
import {
  buildSmoothAreaPath,
  buildSmoothLinePath,
  CHART_PADDING,
  CHART_PALETTE,
  getVisibleLabelIndices,
  pointX,
} from './chart-utils'
import { useChartWidth } from './use-chart-width'

export interface LineChartPoint {
  label: string
  value: number
}

export interface LineChartProps {
  points: LineChartPoint[]
  height?: number
  formatValue?: (value: number) => string
  yMax?: number
  referenceLine?: number
  referenceLineLabel?: string
  strokeColor?: string
  maxXLabels?: number
  svgClassName?: string
  className?: string
}

export function LineChart({
  points,
  height = 200,
  formatValue = (v) => v.toLocaleString(),
  yMax,
  referenceLine,
  referenceLineLabel,
  strokeColor = CHART_PALETTE.primary,
  maxXLabels,
  svgClassName = 'h-48 w-full sm:h-56 md:h-64',
  className,
}: LineChartProps) {
  const gradientId = useId()
  const { ref, width: viewWidth } = useChartWidth()

  if (!points.length) {
    return <p className="text-sm text-muted-foreground">No data available.</p>
  }

  const chartWidth = viewWidth - CHART_PADDING.left - CHART_PADDING.right
  const chartHeight = height - CHART_PADDING.top - CHART_PADDING.bottom
  const maxValue = yMax ?? Math.max(...points.map((p) => p.value), referenceLine ?? 0, 1)
  const baselineY = CHART_PADDING.top + chartHeight

  const valueToY = (value: number) => CHART_PADDING.top + chartHeight - (value / maxValue) * chartHeight

  const coords = points.map((point, index) => ({
    ...point,
    x: pointX(index, points.length, chartWidth),
    y: valueToY(point.value),
  }))

  const linePath = buildSmoothLinePath(coords)
  const areaPath = buildSmoothAreaPath(coords, baselineY)
  const yTicks = [0, 0.5, 1].map((ratio) => ({ ratio, value: maxValue * ratio }))
  const peak = coords.reduce((best, point) => (point.value > best.value ? point : best), coords[0])
  const visibleLabelIndices = new Set(
    maxXLabels ? getVisibleLabelIndices(points.length, maxXLabels) : points.map((_, index) => index)
  )

  return (
    <div ref={ref} className={cn('w-full', className)}>
      <svg
        viewBox={`0 0 ${viewWidth} ${height}`}
        className={cn(svgClassName, 'w-full')}
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label={`Trend: ${points.map((p) => `${p.label} ${formatValue(p.value)}`).join(', ')}`}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={strokeColor} stopOpacity="0.18" />
            <stop offset="100%" stopColor={strokeColor} stopOpacity="0.02" />
          </linearGradient>
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
            stroke={CHART_PALETTE.amber}
            strokeWidth="1.5"
            strokeDasharray="5 4"
            strokeOpacity="0.8"
          />
        )}

        <path d={areaPath} fill={`url(#${gradientId})`} />
        <path
          d={linePath}
          fill="none"
          stroke={strokeColor}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {coords.map((point) => (
          <g key={point.label}>
            <circle
              cx={point.x}
              cy={point.y}
              r="4"
              fill="var(--color-card)"
              stroke={strokeColor}
              strokeWidth="2"
            />
            <title>{`${point.label}: ${formatValue(point.value)}`}</title>
          </g>
        ))}

        {peak.value > 0 && (
          <g>
            <circle cx={peak.x} cy={peak.y} r="10" fill={strokeColor} fillOpacity="0.15" />
            <circle cx={peak.x} cy={peak.y} r="5" fill={strokeColor} stroke="var(--color-card)" strokeWidth="2" />
            <text
              x={peak.x}
              y={peak.y - 14}
              textAnchor="middle"
              className="fill-foreground text-[10px] font-semibold"
            >
              {formatValue(peak.value)}
            </text>
          </g>
        )}

        {coords.map((point, index) =>
          visibleLabelIndices.has(index) ? (
            <text
              key={`label-${point.label}-${index}`}
              x={point.x}
              y={height - 10}
              textAnchor={
                index === 0 ? 'start' : index === coords.length - 1 ? 'end' : 'middle'
              }
              className="fill-muted-foreground text-[10px] sm:text-[11px]"
            >
              {point.label}
            </text>
          ) : null
        )}
      </svg>

      {referenceLineLabel && (
        <p className="mt-2 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
          <span
            className="inline-block w-5 border-t-2 border-dashed border-amber-700/70"
            aria-hidden
          />
          {referenceLineLabel}
        </p>
      )}
    </div>
  )
}
