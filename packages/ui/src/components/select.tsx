import type { SelectHTMLAttributes } from 'react'
import { cn } from '../lib/utils'

export type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  invalid?: boolean
}

export function Select({ className, invalid, children, ...props }: SelectProps) {
  return (
    <select
      className={cn(
        'flex h-10 w-full rounded-xl border bg-white px-3 py-2 text-sm text-[var(--color-ink)] shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]/35 disabled:cursor-not-allowed disabled:opacity-50',
        invalid ? 'border-[var(--color-destructive)]' : 'border-[var(--color-border)]',
        className
      )}
      aria-invalid={invalid || undefined}
      {...props}
    >
      {children}
    </select>
  )
}
