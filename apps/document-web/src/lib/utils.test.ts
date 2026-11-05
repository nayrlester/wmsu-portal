import { describe, expect, it } from 'vitest'
import { cn, formatBytes, formatPercent, statusColor } from '@/lib/utils'

describe('cn', () => {
  it('merges tailwind classes', () => {
    expect(cn('px-2', 'px-4')).toBe('px-4')
    expect(cn('text-sm', false && 'hidden', 'font-medium')).toBe('text-sm font-medium')
  })
})

describe('formatBytes', () => {
  it('formats zero and scales units', () => {
    expect(formatBytes(0)).toBe('0 B')
    expect(formatBytes(1024)).toBe('1.0 KB')
    expect(formatBytes(5_368_709_120)).toBe('5.0 GB')
  })
})

describe('formatPercent', () => {
  it('returns dash when max is null or zero', () => {
    expect(formatPercent(10, null)).toBe('—')
    expect(formatPercent(10, 0)).toBe('—')
  })

  it('calculates percentage capped at 100', () => {
    expect(formatPercent(50, 100)).toBe('50%')
    expect(formatPercent(150, 100)).toBe('100%')
  })
})

describe('statusColor', () => {
  it('returns mapped colors for known statuses', () => {
    expect(statusColor('approved')).toContain('--color-success')
    expect(statusColor('rejected')).toContain('--color-error')
  })

  it('falls back for unknown status', () => {
    expect(statusColor('unknown_status')).toContain('bg-muted')
  })
})
