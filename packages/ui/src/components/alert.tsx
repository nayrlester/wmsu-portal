import { cva, type VariantProps } from 'class-variance-authority'
import { AlertCircle, CheckCircle2, Info, TriangleAlert } from 'lucide-react'
import type { HTMLAttributes, ReactNode } from 'react'
import { cn } from '../lib/utils'

const alertVariants = cva('flex gap-3 rounded-2xl border px-4 py-3 text-sm', {
  variants: {
    variant: {
      default: 'border-[var(--color-border)] bg-white text-[var(--color-ink)]',
      success: 'border-green-200 bg-[var(--color-success-soft)] text-[var(--color-success)]',
      warning: 'border-amber-200 bg-[var(--color-warning-soft)] text-[var(--color-warning)]',
      danger: 'border-red-200 bg-red-50 text-[var(--color-destructive)]',
      info: 'border-blue-200 bg-[var(--color-info-soft)] text-[var(--color-info)]',
    },
  },
  defaultVariants: { variant: 'default' },
})

const icons = {
  default: Info,
  success: CheckCircle2,
  warning: TriangleAlert,
  danger: AlertCircle,
  info: Info,
}

export type AlertProps = HTMLAttributes<HTMLDivElement> &
  VariantProps<typeof alertVariants> & {
    title?: string
    action?: ReactNode
  }

export function Alert({ className, variant = 'default', title, children, action, ...props }: AlertProps) {
  const Icon = icons[variant ?? 'default']
  return (
    <div role="alert" className={cn(alertVariants({ variant }), className)} {...props}>
      <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <div className="min-w-0 flex-1 space-y-1">
        {title ? <p className="font-semibold">{title}</p> : null}
        {children ? <div className="opacity-90">{children}</div> : null}
      </div>
      {action}
    </div>
  )
}
