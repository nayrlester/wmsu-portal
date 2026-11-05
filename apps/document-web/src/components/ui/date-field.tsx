import { forwardRef, useId, type InputHTMLAttributes } from 'react'
import { CalendarDays, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'

type NativeDateProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'type' | 'value' | 'onChange' | 'size'
>

export interface DateFieldProps extends NativeDateProps {
  value?: string
  onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void
  /** Visual density */
  size?: 'default' | 'compact'
}

/**
 * Polished date-only control — wraps native `type="date"` with consistent chrome.
 * Value format: `YYYY-MM-DD`
 */
export const DateField = forwardRef<HTMLInputElement, DateFieldProps>(
  ({ className, value, onChange, size = 'default', disabled, id, ...props }, ref) => {
    const autoId = useId()
    const fieldId = id ?? autoId

    return (
      <div
        className={cn(
          'group relative flex w-full min-w-0 items-center rounded-lg border border-border/80 bg-background transition-premium',
          'focus-within:border-foreground/20 focus-within:ring-2 focus-within:ring-ring/20',
          disabled && 'cursor-not-allowed opacity-50',
          size === 'compact' ? 'h-8' : 'h-9',
          className
        )}
      >
        <CalendarDays
          className="pointer-events-none absolute left-2.5 h-4 w-4 shrink-0 text-muted-foreground"
          aria-hidden
        />
        <input
          ref={ref}
          id={fieldId}
          type="date"
          {...(value !== undefined ? { value } : {})}
          onChange={onChange}
          disabled={disabled}
          className={cn(
            'date-field-native h-full w-full min-w-0 border-0 bg-transparent py-2 pl-9 pr-2 text-sm outline-none',
            'disabled:cursor-not-allowed'
          )}
          {...props}
        />
      </div>
    )
  }
)
DateField.displayName = 'DateField'

export interface DateTimeFieldProps {
  id?: string
  value?: string
  onChange?: (value: string) => void
  disabled?: boolean
  required?: boolean
  className?: string
  /** Name for form libraries that still expect a single field */
  name?: string
  'aria-label'?: string
}

function splitDateTime(value: string | undefined): { date: string; time: string } {
  if (!value) return { date: '', time: '' }
  // Accept `YYYY-MM-DDTHH:mm` or `YYYY-MM-DDTHH:mm:ss`
  const [datePart, timePart = ''] = value.split('T')
  return {
    date: datePart?.slice(0, 10) ?? '',
    time: timePart.slice(0, 5),
  }
}

function joinDateTime(date: string, time: string): string {
  if (!date) return ''
  const safeTime = time || '00:00'
  return `${date}T${safeTime}`
}

/**
 * Datetime control split into Date + Time for readable layout (avoids broken
 * native `datetime-local` placeholders like `dd/mm/yyyy --:-- --`).
 * Value format: `YYYY-MM-DDTHH:mm` (compatible with existing `toIso` helpers).
 */
export function DateTimeField({
  id,
  value,
  onChange,
  disabled,
  required,
  className,
  name,
  'aria-label': ariaLabel,
}: DateTimeFieldProps) {
  const autoId = useId()
  const baseId = id ?? autoId
  const { date, time } = splitDateTime(value)

  const emit = (nextDate: string, nextTime: string) => {
    onChange?.(joinDateTime(nextDate, nextTime))
  }

  return (
    <div className={cn('grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-[1.2fr_0.9fr]', className)}>
      <div className="min-w-0 space-y-1">
        <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          Date
        </span>
        <div
          className={cn(
            'group relative flex h-9 w-full min-w-0 items-center rounded-lg border border-border/80 bg-background transition-premium',
            'focus-within:border-foreground/20 focus-within:ring-2 focus-within:ring-ring/20',
            disabled && 'cursor-not-allowed opacity-50'
          )}
        >
          <CalendarDays
            className="pointer-events-none absolute left-2.5 h-4 w-4 text-muted-foreground"
            aria-hidden
          />
          <input
            id={`${baseId}-date`}
            name={name ? `${name}Date` : undefined}
            type="date"
            value={date}
            required={required}
            disabled={disabled}
            aria-label={ariaLabel ? `${ariaLabel} date` : 'Date'}
            onChange={(e) => emit(e.target.value, time)}
            className="date-field-native h-full w-full min-w-0 border-0 bg-transparent py-2 pl-9 pr-2 text-sm outline-none"
          />
        </div>
      </div>
      <div className="min-w-0 space-y-1">
        <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          Time
        </span>
        <div
          className={cn(
            'group relative flex h-9 w-full min-w-0 items-center rounded-lg border border-border/80 bg-background transition-premium',
            'focus-within:border-foreground/20 focus-within:ring-2 focus-within:ring-ring/20',
            disabled && 'cursor-not-allowed opacity-50'
          )}
        >
          <Clock
            className="pointer-events-none absolute left-2.5 h-4 w-4 text-muted-foreground"
            aria-hidden
          />
          <input
            id={`${baseId}-time`}
            name={name ? `${name}Time` : undefined}
            type="time"
            value={time}
            disabled={disabled}
            aria-label={ariaLabel ? `${ariaLabel} time` : 'Time'}
            onChange={(e) => emit(date, e.target.value)}
            className="date-field-native h-full w-full min-w-0 border-0 bg-transparent py-2 pl-9 pr-2 text-sm outline-none"
          />
        </div>
      </div>
    </div>
  )
}
