import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export { formatCurrency, formatNumber } from '@wmsu/ui'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** API often returns related rows as objects; never render those raw in JSX. */
export type DisplayLabel =
  string | { name?: string | null; code?: string | null; slug?: string | null }

export function labelOf(value: DisplayLabel | null | undefined): string {
  if (value == null) return ''
  if (typeof value === 'string') return value.trim()
  return String(value.name ?? value.code ?? value.slug ?? '').trim()
}

export function formatLabelList(
  values: DisplayLabel[] | null | undefined,
  opts?: { limit?: number; empty?: string }
): string {
  const labels = (values ?? []).map(labelOf).filter(Boolean)
  if (labels.length === 0) return opts?.empty ?? '—'
  const limit = opts?.limit
  if (limit != null && labels.length > limit) {
    return `${labels.slice(0, limit).join(', ')} +${labels.length - limit}`
  }
  return labels.join(', ')
}
