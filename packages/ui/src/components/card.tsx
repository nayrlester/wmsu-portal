import type { HTMLAttributes, ReactNode } from 'react'
import { cn } from '../lib/utils'

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] shadow-[var(--shadow-soft)]',
        className
      )}
      {...props}
    />
  )
}

export function CardHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex flex-col gap-1 border-b border-[var(--color-border)] px-5 py-4', className)} {...props} />
}

export function CardTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn('text-base font-semibold text-[var(--color-ink)]', className)} {...props} />
}

export function CardDescription({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn('text-sm text-[var(--color-muted-foreground)]', className)} {...props} />
}

export function CardContent({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('px-5 py-4', className)} {...props} />
}

export function CardFooter({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex items-center gap-2 border-t border-[var(--color-border)] px-5 py-4', className)} {...props} />
}

export type DashboardCardProps = {
  title: string
  value: string | number
  hint?: string
  icon?: ReactNode
  tone?: 'default' | 'primary' | 'success' | 'warning'
  className?: string
}

export function DashboardCard({ title, value, hint, icon, tone = 'default', className }: DashboardCardProps) {
  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardContent className="flex items-start justify-between gap-4 py-5">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-muted-foreground)]">{title}</p>
          <p className="text-3xl font-semibold tracking-tight text-[var(--color-ink)]">{value}</p>
          {hint ? <p className="text-xs text-[var(--color-muted-foreground)]">{hint}</p> : null}
        </div>
        {icon ? (
          <div
            className={cn(
              'flex h-11 w-11 items-center justify-center rounded-2xl',
              tone === 'primary' && 'bg-[var(--color-primary-soft)] text-[var(--color-primary)]',
              tone === 'success' && 'bg-[var(--color-success-soft)] text-[var(--color-success)]',
              tone === 'warning' && 'bg-[var(--color-warning-soft)] text-[var(--color-warning)]',
              tone === 'default' && 'bg-[var(--color-muted)] text-[var(--color-wmsu-navy)]'
            )}
          >
            {icon}
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}
