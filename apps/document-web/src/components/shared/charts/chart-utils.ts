export interface ChartPoint {
  x: number
  y: number
}

export const CHART_PADDING = { top: 20, right: 20, bottom: 40, left: 44 }

/** Shared sizing for dashboard analytics charts (Trends overview + Daily uploads). */
export const DASHBOARD_TREND_CHART_HEIGHT = 260
export const DASHBOARD_TREND_CHART_SVG_CLASS = 'h-56 w-full sm:h-64 md:h-72'
export const DASHBOARD_TREND_LEGEND_SPACER_CLASS = 'mb-5 min-h-9'
export const DASHBOARD_TREND_SKELETON_CLASS = 'h-64 w-full sm:h-72'

/** Muted, dark chart colors — no neon gradients */
export const CHART_PALETTE = {
  primary: '#1F2937',
  slate: '#334155',
  navy: '#1E3A5F',
  teal: '#0F766E',
  indigo: '#3730A3',
  amber: '#B45309',
  rose: '#BE123C',
  stone: '#44403C',
} as const

export const CHART_SERIES_COLORS = [
  CHART_PALETTE.teal,
  CHART_PALETTE.slate,
  CHART_PALETTE.indigo,
  CHART_PALETTE.navy,
  CHART_PALETTE.stone,
]

export function pointX(index: number, count: number, chartWidth: number, paddingLeft = CHART_PADDING.left) {
  if (count <= 1) return paddingLeft + chartWidth / 2
  return paddingLeft + (index / (count - 1)) * chartWidth
}

/** Pick evenly spaced x-axis label indices (always includes first and last). */
export function getVisibleLabelIndices(count: number, maxLabels: number): number[] {
  if (count <= 0) return []
  if (count <= maxLabels) return Array.from({ length: count }, (_, index) => index)

  const indices = new Set<number>([0, count - 1])
  const step = (count - 1) / (maxLabels - 1)

  for (let slot = 1; slot < maxLabels - 1; slot += 1) {
    indices.add(Math.round(slot * step))
  }

  return [...indices].sort((a, b) => a - b)
}

export function buildSmoothLinePath(points: ChartPoint[]): string {
  if (!points.length) return ''
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`
  if (points.length === 2) {
    return `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y}`
  }

  let path = `M ${points[0].x} ${points[0].y}`

  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] ?? points[i]
    const p1 = points[i]
    const p2 = points[i + 1]
    const p3 = points[i + 2] ?? p2

    const cp1x = p1.x + (p2.x - p0.x) / 6
    const cp1y = p1.y + (p2.y - p0.y) / 6
    const cp2x = p2.x - (p3.x - p1.x) / 6
    const cp2y = p2.y - (p3.y - p1.y) / 6

    path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`
  }

  return path
}

export function buildSmoothAreaPath(points: ChartPoint[], baselineY: number): string {
  if (!points.length) return ''
  const line = buildSmoothLinePath(points)
  const last = points[points.length - 1]
  const first = points[0]
  return `${line} L ${last.x} ${baselineY} L ${first.x} ${baselineY} Z`
}
