import type { TextareaHTMLAttributes } from 'react'
import { cn } from '../lib/utils'

export type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  invalid?: boolean
}

export function Textarea({ className, invalid, ...props }: TextareaProps) {
  return (
    <textarea
      className={cn(
        'flex min-h-24 w-full rounded-xl border bg-white px-3 py-2 text-sm text-[var(--color-ink)] shadow-sm transition-colors placeholder:text-[var(--color-muted-foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]/35 disabled:cursor-not-allowed disabled:opacity-50',
        invalid ? 'border-[var(--color-destructive)]' : 'border-[var(--color-border)]',
        className
      )}
      aria-invalid={invalid || undefined}
      {...props}
    />
  )
}
