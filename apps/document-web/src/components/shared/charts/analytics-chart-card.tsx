import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export interface AnalyticsChartCardProps {
  title: string
  description?: string
  action?: ReactNode
  children: ReactNode
  className?: string
}

export function AnalyticsChartCard({
  title,
  description,
  action,
  children,
  className,
}: AnalyticsChartCardProps) {
  return (
    <section
      className={cn(
        'overflow-hidden rounded-2xl border border-border/70 bg-card text-card-foreground shadow-sm',
        className
      )}
    >
      <div className="flex items-start justify-between gap-3 border-b border-border/60 px-5 py-4 sm:px-6">
        <div>
          <h3 className="text-base font-semibold tracking-tight text-foreground sm:text-lg">{title}</h3>
          {description && (
            <p className="mt-0.5 text-xs text-muted-foreground sm:text-sm">{description}</p>
          )}
        </div>
        {action}
      </div>
      <div className="bg-card px-4 py-4 sm:px-6 sm:py-5">{children}</div>
    </section>
  )
}
