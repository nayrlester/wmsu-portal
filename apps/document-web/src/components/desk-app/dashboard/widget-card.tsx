import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export interface WidgetCardProps {
  title: string
  description?: string
  action?: ReactNode
  children: ReactNode
  className?: string
  bodyClassName?: string
}

export function WidgetCard({ title, description, action, children, className, bodyClassName }: WidgetCardProps) {
  return (
    <section className={cn('surface-card overflow-hidden', className)}>
      <div className="flex items-start justify-between gap-3 border-b border-border/60 px-5 py-4">
        <div>
          <h3 className="text-heading">{title}</h3>
          {description && <p className="mt-0.5 text-caption">{description}</p>}
        </div>
        {action}
      </div>
      <div className={cn('px-5 py-4', bodyClassName)}>{children}</div>
    </section>
  )
}
