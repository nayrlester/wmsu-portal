import { cva, type VariantProps } from 'class-variance-authority'
import type { HTMLAttributes } from 'react'
import { cn } from '../lib/utils'

const badgeVariants = cva(
  'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold tracking-wide',
  {
    variants: {
      variant: {
        default: 'bg-[var(--color-primary-soft)] text-[var(--color-primary)]',
        secondary: 'bg-[var(--color-muted)] text-[var(--color-wmsu-navy)]',
        success: 'bg-[var(--color-success-soft)] text-[var(--color-success)]',
        warning: 'bg-[var(--color-warning-soft)] text-[var(--color-warning)]',
        danger: 'bg-red-100 text-[var(--color-destructive)]',
        info: 'bg-[var(--color-info-soft)] text-[var(--color-info)]',
        outline: 'border border-[var(--color-border)] text-[var(--color-ink)]',
      },
    },
    defaultVariants: { variant: 'default' },
  }
)

export type BadgeProps = HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />
}

export type StatusTone = 'neutral' | 'success' | 'warning' | 'danger' | 'info'

const statusMap: Record<StatusTone, VariantProps<typeof badgeVariants>['variant']> = {
  neutral: 'secondary',
  success: 'success',
  warning: 'warning',
  danger: 'danger',
  info: 'info',
}

export function StatusBadge({
  tone = 'neutral',
  label,
  className,
}: {
  tone?: StatusTone
  label: string
  className?: string
}) {
  return (
    <Badge variant={statusMap[tone]} className={cn('gap-1.5', className)}>
      <span
        className={cn(
          'inline-block h-1.5 w-1.5 rounded-full',
          tone === 'success' && 'bg-[var(--color-success)]',
          tone === 'warning' && 'bg-[var(--color-warning)]',
          tone === 'danger' && 'bg-[var(--color-destructive)]',
          tone === 'info' && 'bg-[var(--color-info)]',
          tone === 'neutral' && 'bg-[var(--color-muted-foreground)]'
        )}
        aria-hidden
      />
      {label}
    </Badge>
  )
}
