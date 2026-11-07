import { forwardRef, useId } from 'react'
import type { InputHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, label, error, id, required, ...props }, ref) => {
    const generatedId = useId()
    const inputId = id ?? generatedId
    return (
      <div className="space-y-1.5">
        {label ? (
          <label htmlFor={inputId} className="block text-sm font-medium text-foreground">
            {label}
            {required ? <span className="ml-1 text-destructive">*</span> : null}
          </label>
        ) : null}
        <input
          type={type}
          id={inputId}
          required={required}
          aria-label={label ? undefined : props['aria-label'] ?? props.placeholder}
          className={cn(
            'flex h-9 w-full rounded-lg border border-border/80 bg-background px-3 py-2 text-sm transition-premium',
            'placeholder:text-muted-foreground/70',
            'focus-visible:outline-none focus-visible:border-foreground/20 focus-visible:ring-2 focus-visible:ring-ring/20',
            'disabled:cursor-not-allowed disabled:opacity-50',
            error && 'border-destructive',
            className
          )}
          ref={ref}
          {...props}
        />
        {error ? <p className="text-xs text-destructive">{error}</p> : null}
      </div>
    )
  }
)
Input.displayName = 'Input'
