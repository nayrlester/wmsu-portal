import { useCallback, useId, useMemo, useState } from 'react'
import { cn } from '@/lib/utils'
import type { DashboardTrendPoint, UsageTrendReport } from '@/types/api'
import { buildSmoothAreaPath, buildSmoothLinePath, pointX, DASHBOARD_TREND_CHART_HEIGHT, DASHBOARD_TREND_CHART_SVG_CLASS } from './chart-utils'
import { buildUsageTrendSeries } from './plan-usage-trend-chart'
import { useChartWidth } from './use-chart-width'

const CHART_INSET = { top: 12, right: 24, bottom: 36, left: 24 }

interface SeriesStyle {
  id: string
  label: string
  values: number[]
  axis: 'left' | 'right'
  formatValue: (value: number) => string
  gradient: [string, string]
  bandColor: string
}

export interface DashboardTrendsChartProps {
  usageTrend?: UsageTrendReport
  documentTrend?: DashboardTrendPoint[]
  className?: string
}

const SERIES_GRADIENTS: Record<string, { gradient: [string, string]; bandColor: string }> = {
  users: { gradient: ['#22D3EE', '#3B82F6'], bandColor: '#22D3EE' },
  documents: { gradient: ['#F472B6', '#A855F7'], bandColor: '#EC4899' },
  storage: { gradient: ['#818CF8', '#6366F1'], bandColor: '#818CF8' },
  volume: { gradient: ['#34D399', '#0EA5E9'], bandColor: '#14B8A6' },
}

export function DashboardTrendsChart({
  usageTrend,
  documentTrend,
  className,
}: DashboardTrendsChartProps) {
  const gradientPrefix = useId().replace(/:/g, '')
  const { ref, width: viewWidth } = useChartWidth()
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)
  const [activeSeries, setActiveSeries] = useState<Set<string>>(new Set())

  const { labels, allSeries } = useMemo(() => {
    const docLabels = documentTrend?.map((point) => point.month) ?? []
    const usageLabels = usageTrend?.monthly.map((point) => point.month) ?? []
    const mergedLabels = docLabels.length >= usageLabels.length ? docLabels : usageLabels
    const plotSeries: SeriesStyle[] = []

    if (usageTrend?.monthly.length) {
      const { series: usageSeries } = buildUsageTrendSeries(usageTrend)
      for (const line of usageSeries) {
        const style = SERIES_GRADIENTS[line.id] ?? SERIES_GRADIENTS.documents
        plotSeries.push({
          id: line.id,
          label: line.label,
          values: alignValues(mergedLabels, usageTrend.monthly, (point) => point[line.id as keyof typeof point] as number | null),
          axis: 'left',
          formatValue: (value) => `${Math.round(value)}%`,
          gradient: style.gradient,
          bandColor: style.bandColor,
        })
      }
    }

    if (documentTrend?.length) {
      const style = SERIES_GRADIENTS.volume
      plotSeries.push({
        id: 'volume',
        label: 'Volume',
        values: alignValues(mergedLabels, documentTrend, (point) => point.count),
        axis: 'right',
        formatValue: (value) => value.toLocaleString(),
        gradient: style.gradient,
        bandColor: style.bandColor,
      })
    }

    return { labels: mergedLabels, allSeries: plotSeries }
  }, [usageTrend, documentTrend])

  const visibleIds = useMemo(() => {
    if (activeSeries.size === 0) return new Set(allSeries.map((s) => s.id))
    return activeSeries
  }, [activeSeries, allSeries])

  const series = allSeries.filter((line) => visibleIds.has(line.id))

  const chartWidth = viewWidth - CHART_INSET.left - CHART_INSET.right
  const chartHeight = DASHBOARD_TREND_CHART_HEIGHT - CHART_INSET.top - CHART_INSET.bottom
  const leftMax = 100
  const rightMax = Math.max(...(allSeries.find((s) => s.id === 'volume')?.values ?? [0]), 1)

  const leftToY = useCallback(
    (value: number) => CHART_INSET.top + chartHeight - (value / leftMax) * chartHeight,
    [chartHeight]
  )
  const rightToY = useCallback(
    (value: number) => CHART_INSET.top + chartHeight - (value / rightMax) * chartHeight,
    [chartHeight, rightMax]
  )

  const resolveNearestIndex = useCallback(
    (clientX: number, svg: SVGSVGElement) => {
      if (!labels.length) return null
      const rect = svg.getBoundingClientRect()
      const relativeX = ((clientX - rect.left) / rect.width) * viewWidth
      let nearest = 0
      let minDistance = Infinity
      labels.forEach((_, index) => {
        const x = pointX(index, labels.length, chartWidth, CHART_INSET.left)
        const distance = Math.abs(relativeX - x)
        if (distance < minDistance) {
          minDistance = distance
          nearest = index
        }
      })
      return nearest
    },
    [labels, chartWidth, viewWidth]
  )

  const toggleSeries = (id: string) => {
    setActiveSeries((prev) => {
      const base = prev.size === 0 ? new Set(allSeries.map((s) => s.id)) : new Set(prev)
      if (base.has(id)) {
        if (base.size <= 1) return base
        base.delete(id)
      } else {
        base.add(id)
      }
      return base
    })
  }

  if (!labels.length || !allSeries.length) {
    return <p className="text-sm text-muted-foreground">No trend data available yet.</p>
  }

  const gridLines = 5
  const baselineY = CHART_INSET.top + chartHeight
  const hoverX =
    hoveredIndex !== null ? pointX(hoveredIndex, labels.length, chartWidth, CHART_INSET.left) : null

  const ariaLabel = series
    .map((line) => `${line.label}: ${labels.map((label, i) => `${label} ${line.formatValue(line.values[i] ?? 0)}`).join(', ')}`)
    .join('; ')

  return (
    <div ref={ref} className={cn('w-full', className)}>
      <div className="mb-5 flex flex-wrap justify-center gap-2 sm:gap-3">
        {allSeries.map((line) => {
          const isActive = visibleIds.has(line.id)
          const [from, to] = line.gradient
          return (
            <button
              key={line.id}
              type="button"
              onClick={() => toggleSeries(line.id)}
              className={cn(
                'rounded-full px-4 py-1.5 text-[11px] font-semibold uppercase tracking-wider transition-all duration-200 sm:px-5 sm:text-xs',
                isActive
                  ? 'text-white shadow-md'
                  : 'border border-border/60 bg-card text-muted-foreground hover:border-transparent hover:text-foreground'
              )}
              style={
                isActive
                  ? { background: `linear-gradient(135deg, ${from}, ${to})` }
                  : { borderColor: `${from}55` }
              }
              aria-pressed={isActive}
            >
              {line.label}
            </button>
          )
        })}
      </div>

      <div className="relative">
        <svg
          viewBox={`0 0 ${viewWidth} ${DASHBOARD_TREND_CHART_HEIGHT}`}
          className={cn(DASHBOARD_TREND_CHART_SVG_CLASS, 'cursor-crosshair')}
          preserveAspectRatio="xMidYMid meet"
          role="img"
          aria-label={ariaLabel}
          onMouseMove={(event) => setHoveredIndex(resolveNearestIndex(event.clientX, event.currentTarget))}
          onMouseLeave={() => setHoveredIndex(null)}
        >
          <defs>
            {allSeries.map((line) => (
              <g key={line.id}>
                <linearGradient
                  id={`${gradientPrefix}-${line.id}-stroke`}
                  x1="0%"
                  y1="0%"
                  x2="100%"
                  y2="0%"
                >
                  <stop offset="0%" stopColor={line.gradient[0]} />
                  <stop offset="100%" stopColor={line.gradient[1]} />
                </linearGradient>
                <linearGradient
                  id={`${gradientPrefix}-${line.id}-area`}
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop offset="0%" stopColor={line.gradient[0]} stopOpacity="0.2" />
                  <stop offset="100%" stopColor={line.gradient[1]} stopOpacity="0.02" />
                </linearGradient>
              </g>
            ))}
          </defs>

          {Array.from({ length: gridLines }, (_, index) => {
            const ratio = index / (gridLines - 1)
            const y = CHART_INSET.top + chartHeight * ratio
            return (
              <line
                key={ratio}
                x1={CHART_INSET.left}
                y1={y}
                x2={viewWidth - CHART_INSET.right}
                y2={y}
                stroke="var(--color-border)"
                strokeWidth="1"
                strokeOpacity={0.35}
              />
            )
          })}

          {hoverX !== null && (
            <line
              x1={hoverX}
              y1={CHART_INSET.top}
              x2={hoverX}
              y2={baselineY}
              stroke="var(--color-foreground)"
              strokeWidth="1"
              strokeOpacity="0.2"
              className="transition-opacity duration-200"
            />
          )}

          {series.map((line) => {
            const valueToY = line.axis === 'left' ? leftToY : rightToY
            const coords = labels.map((label, index) => ({
              label,
              value: line.values[index] ?? 0,
              x: pointX(index, labels.length, chartWidth, CHART_INSET.left),
              y: valueToY(line.values[index] ?? 0),
            }))
            const linePath = buildSmoothLinePath(coords)
            const areaPath = buildSmoothAreaPath(coords, baselineY)
            const hasHover = hoveredIndex !== null

            return (
              <g key={line.id}>
                <path
                  d={areaPath}
                  fill={`url(#${gradientPrefix}-${line.id}-area)`}
                  className="transition-opacity duration-200"
                />
                <path
                  d={linePath}
                  fill="none"
                  stroke={`url(#${gradientPrefix}-${line.id}-stroke)`}
                  strokeWidth={hasHover ? 4 : 3.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="transition-all duration-200 ease-out"
                />
                {coords.map((point, index) => {
                  const active = hoveredIndex === index
                  return (
                    <g key={`${line.id}-${point.label}`}>
                      <circle
                        cx={point.x}
                        cy={point.y}
                        r={active ? 8 : 0}
                        fill={line.bandColor}
                        fillOpacity={0.15}
                        className="transition-all duration-200 ease-out"
                      />
                      <circle
                        cx={point.x}
                        cy={point.y}
                        r={active ? 5.5 : 3.5}
                        fill="var(--color-card)"
                        stroke={line.gradient[1]}
                        strokeWidth={active ? 2.5 : 2}
                        className="transition-all duration-200 ease-out"
                      />
                      <title>{`${line.label} · ${point.label}: ${line.formatValue(point.value)}`}</title>
                    </g>
                  )
                })}
              </g>
            )
          })}

          {labels.map((label, index) => (
            <text
              key={label}
              x={pointX(index, labels.length, chartWidth, CHART_INSET.left)}
              y={DASHBOARD_TREND_CHART_HEIGHT - 8}
              textAnchor="middle"
              className={cn(
                'fill-muted-foreground text-[11px] font-medium transition-all duration-200 sm:text-xs',
                hoveredIndex === index && 'fill-foreground font-semibold'
              )}
            >
              {label}
            </text>
          ))}
        </svg>

        {hoveredIndex !== null && (
          <div
            className="pointer-events-none absolute z-10 min-w-[9rem] rounded-lg border border-border/70 bg-card px-3 py-2 text-card-foreground shadow-md animate-in fade-in-0 zoom-in-95 duration-150"
            style={{
              left: `${((hoverX ?? 0) / viewWidth) * 100}%`,
              top: 8,
              transform: 'translateX(-50%)',
            }}
          >
            <p className="mb-1.5 text-xs font-semibold text-foreground">{labels[hoveredIndex]}</p>
            <ul className="space-y-1">
              {series.map((line) => (
                <li key={line.id} className="flex items-center justify-between gap-3 text-[11px]">
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ background: `linear-gradient(135deg, ${line.gradient[0]}, ${line.gradient[1]})` }}
                      aria-hidden
                    />
                    {line.label}
                  </span>
                  <span className="font-medium tabular-nums text-foreground">
                    {line.formatValue(line.values[hoveredIndex] ?? 0)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}

function alignValues<T extends { month: string }>(
  labels: string[],
  source: T[],
  pick: (row: T) => number | null | undefined
): number[] {
  const byMonth = new Map(source.map((row) => [row.month, pick(row) ?? 0]))
  return labels.map((month) => byMonth.get(month) ?? 0)
}
