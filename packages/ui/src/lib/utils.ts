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
