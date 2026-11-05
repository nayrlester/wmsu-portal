import type { InputHTMLAttributes } from 'react'
import { cn } from '../lib/utils'

export type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  invalid?: boolean
}

export function Input({ className, invalid, ...props }: InputProps) {
  return (
    <input
      className={cn(
        'flex h-10 w-full rounded-xl border bg-white px-3 py-2 text-sm text-[var(--color-ink)] shadow-sm transition-colors placeholder:text-[var(--color-muted-foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]/35 disabled:cursor-not-allowed disabled:opacity-50',
        invalid ? 'border-[var(--color-destructive)]' : 'border-[var(--color-border)]',
        className
      )}
      aria-invalid={invalid || undefined}
      {...props}
    />
  )
}
