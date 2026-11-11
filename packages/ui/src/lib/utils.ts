import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number | string | null | undefined): string {
  if (amount === null || amount === undefined || amount === '') return '—'
  const value =
    typeof amount === 'number' ? amount : Number(String(amount).replace(/,/g, '').trim())
  if (!Number.isFinite(value)) return '—'
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

export function formatNumber(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === '') return '—'
  const amount = typeof value === 'number' ? value : Number(String(value).replace(/,/g, '').trim())
  if (!Number.isFinite(amount)) return '—'
  return new Intl.NumberFormat('en-PH', { maximumFractionDigits: 2 }).format(amount)
}

const MANILA_TZ = 'Asia/Manila'

export function formatDateTime(
  value: string | number | Date | null | undefined,
  opts?: Intl.DateTimeFormatOptions
): string {
  if (value == null || value === '') return '—'
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleString('en-PH', {
    timeZone: MANILA_TZ,
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: 'numeric',
    minute: '2-digit',
    ...opts,
  })
}

export function formatCampusDate(
  value: string | number | Date | null | undefined,
  opts?: Intl.DateTimeFormatOptions
): string {
  if (value == null || value === '') return '—'
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleDateString('en-PH', {
    timeZone: MANILA_TZ,
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    ...opts,
  })
}
