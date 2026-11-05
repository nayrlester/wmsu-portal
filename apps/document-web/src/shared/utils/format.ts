import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('en-PH', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(date))
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return `${(bytes / 1024 ** i).toFixed(i > 0 ? 1 : 0)} ${units[i]}`
}

export function formatPercent(used: number, max: number | null): string {
  if (max === null || max === 0) return '—'
  return `${Math.min(100, Math.round((used / max) * 100))}%`
}

/** Approximate USD → PHP for marketing display when API prices are stored in USD. */
export const USD_TO_PHP_RATE = 56

export function formatCurrency(
  amount: number,
  currency: string = 'PHP',
  options?: { fromUsd?: boolean }
): string {
  const value =
    options?.fromUsd && currency === 'PHP' ? Math.round(amount * USD_TO_PHP_RATE) : amount

  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency,
    minimumFractionDigits: currency === 'PHP' ? 0 : 2,
    maximumFractionDigits: currency === 'PHP' ? 0 : 2,
  }).format(value)
}

/** Monthly plan price in Philippine Peso (₱). */
export function formatPlanMonthlyPrice(usdMonthlyPrice: number): string {
  return `${formatCurrency(usdMonthlyPrice, 'PHP', { fromUsd: true })}/buwan`
}

/** Minimal status pills — soft muted backgrounds */
export function statusColor(status: string): string {
  const map: Record<string, string> = {
    draft: 'bg-muted text-muted-foreground ring-1 ring-border/60',
    submitted: 'bg-[var(--color-info-muted)] text-[var(--color-info)] ring-1 ring-[var(--color-info)]/15',
    pending_review: 'bg-[var(--color-warning-muted)] text-[var(--color-warning)] ring-1 ring-[var(--color-warning)]/15',
    pending_approval: 'bg-[var(--color-warning-muted)] text-[var(--color-warning)] ring-1 ring-[var(--color-warning)]/15',
    approved: 'bg-[var(--color-success-muted)] text-[var(--color-success)] ring-1 ring-[var(--color-success)]/15',
    rejected: 'bg-[var(--color-error-muted)] text-[var(--color-error)] ring-1 ring-[var(--color-error)]/15',
    completed: 'bg-[var(--color-success-muted)] text-[var(--color-success)] ring-1 ring-[var(--color-success)]/15',
    archived: 'bg-muted text-muted-foreground ring-1 ring-border/60',
    published: 'bg-[var(--color-success-muted)] text-[var(--color-success)] ring-1 ring-[var(--color-success)]/15',
  }
  return map[status] ?? 'bg-muted text-muted-foreground ring-1 ring-border/60'
}
