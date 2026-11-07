import { useId, type InputHTMLAttributes } from 'react'
import { cn } from '../lib/utils'

export type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  invalid?: boolean
  label?: string
  error?: string
}

export function Input({ className, invalid, label, error, id, required, ...props }: InputProps) {
  const generatedId = useId()
  const inputId = id ?? generatedId
  return (
    <div className="space-y-1.5">
      {label ? (
        <label htmlFor={inputId} className="block text-sm font-medium text-[var(--color-ink)]">
          {label}
          {required ? <span className="ml-1 text-[var(--color-destructive)]">*</span> : null}
        </label>
      ) : null}
      <input
        id={inputId}
        required={required}
        className={cn(
          'flex h-10 w-full rounded-xl border bg-white px-3 py-2 text-sm text-[var(--color-ink)] shadow-sm transition-colors placeholder:text-[var(--color-muted-foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]/35 disabled:cursor-not-allowed disabled:opacity-50',
          invalid || error ? 'border-[var(--color-destructive)]' : 'border-[var(--color-border)]',
          className
        )}
        aria-invalid={invalid || Boolean(error) || undefined}
        aria-label={label ? undefined : props['aria-label'] ?? props.placeholder}
        {...props}
      />
      {error ? (
        <p className="text-xs font-medium text-[var(--color-destructive)]">{error}</p>
      ) : null}
    </div>
  )
}
