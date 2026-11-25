import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export { formatCampusDate, formatCurrency, formatDateTime, formatNumber } from '@wmsu/ui'

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

type PersonNameParts = {
  fullName?: string | null
  name?: string | null
  lastName?: string | null
  firstName?: string | null
  email?: string | null
}

function scrubDisplayText(value: unknown): string {
  const text = String(value ?? '').trim()
  if (!text) return ''
  if (/^undefined(\s*,\s*undefined)?$/i.test(text)) return ''
  if (/^null(\s*,\s*null)?$/i.test(text)) return ''
  return text
}

export function formatPersonName(
  person: PersonNameParts | null | undefined,
  empty = '—'
): string {
  if (!person) return empty
  const full = scrubDisplayText(person.fullName ?? person.name)
  if (full) return full
  const last = scrubDisplayText(person.lastName)
  const first = scrubDisplayText(person.firstName)
  if (last && first) return `${last}, ${first}`
  if (last) return last
  if (first) return first
  const email = scrubDisplayText(person.email)
  if (email) return email
  return empty
}

export function formatFacultyNames(
  names: Array<string | null | undefined> | null | undefined,
  empty = 'No assigned faculty yet'
): string {
  const cleaned = [...new Set((names ?? []).map(scrubDisplayText).filter(Boolean))]
  return cleaned.length ? cleaned.join('; ') : empty
}

export function displayOrFallback(value: unknown, empty = '—'): string {
  const text = scrubDisplayText(value)
  return text || empty
}
