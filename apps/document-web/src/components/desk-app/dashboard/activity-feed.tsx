import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export interface ActivityFeedItem {
  id: string
  title: ReactNode
  subtitle?: ReactNode
  meta?: ReactNode
  action?: ReactNode
  avatarText?: string
}

export interface ActivityFeedProps {
  items: ActivityFeedItem[]
  loading?: boolean
  emptyMessage?: string
  className?: string
}

export function ActivityFeed({
  items,
  loading,
  emptyMessage = 'No activity yet.',
  className,
}: ActivityFeedProps) {
  if (loading) {
    return <p className={cn('text-caption py-4', className)}>Loading…</p>
  }

  if (!items.length) {
    return <p className={cn('text-caption py-8 text-center', className)}>{emptyMessage}</p>
  }

  return (
    <ul className={cn('divide-y divide-border/60', className)}>
      {items.map((item) => {
        const avatar =
          item.avatarText ??
          (typeof item.title === 'string' ? item.title.charAt(0).toUpperCase() : '·')

        return (
          <li
            key={item.id}
            className="flex items-center justify-between gap-4 py-3.5 transition-premium first:pt-0 last:pb-0 hover:bg-muted/30 -mx-2 px-2 rounded-md"
          >
            <div className="flex min-w-0 items-start gap-3">
              <div
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted text-xs font-medium text-muted-foreground"
                aria-hidden
              >
                {avatar}
              </div>
              <div className="min-w-0">
                <div className="text-sm font-medium leading-snug">{item.title}</div>
                {item.subtitle && (
                  <div className="mt-0.5 truncate text-caption">{item.subtitle}</div>
                )}
                {item.meta && <div className="mt-1 text-[11px] text-muted-foreground/80">{item.meta}</div>}
              </div>
            </div>
            {item.action}
          </li>
        )
      })}
    </ul>
  )
}
