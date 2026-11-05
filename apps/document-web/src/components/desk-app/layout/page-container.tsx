import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export interface PageContainerProps {
  title: string
  description?: string
  breadcrumb?: string
  action?: ReactNode
  children: ReactNode
  className?: string
}

export function PageContainer({
  title,
  description,
  breadcrumb,
  action,
  children,
  className,
}: PageContainerProps) {
  return (
    <div className={cn('mx-auto max-w-[1400px] space-y-8', className)}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          {breadcrumb && (
            <nav aria-label="Breadcrumb" className="text-caption">
              {breadcrumb}
            </nav>
          )}
          <h1 className="text-display">{title}</h1>
          {description && <p className="max-w-2xl text-sm text-muted-foreground">{description}</p>}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      {children}
    </div>
  )
}

export interface ContentWrapperProps {
  children: ReactNode
  className?: string
}

export function ContentWrapper({ children, className }: ContentWrapperProps) {
  return <div className={cn('space-y-6', className)}>{children}</div>
}
