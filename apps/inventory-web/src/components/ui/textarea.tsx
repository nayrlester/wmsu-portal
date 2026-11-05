import { forwardRef } from 'react'
import type { TextareaHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-')
    return (
      <div className="space-y-1.5">
        {label && (
          <label htmlFor={inputId} className="block text-sm font-medium text-[var(--color-ink)]">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={inputId}
          className={cn(
            'flex min-h-[96px] w-full rounded-2xl border border-transparent bg-[var(--color-primary-soft)] px-4 py-3 text-sm text-[var(--color-ink)]',
            'placeholder:text-[#9aa0c3] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/35',
            'disabled:cursor-not-allowed disabled:opacity-50',
            error && 'ring-2 ring-rose-300',
            className
          )}
          {...props}
        />
        {error && <p className="text-xs text-rose-600">{error}</p>}
      </div>
    )
  }
)
Textarea.displayName = 'Textarea'
