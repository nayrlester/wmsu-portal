import type { ReactNode } from 'react'
import { Inbox } from 'lucide-react'
import { cn } from '../lib/utils'

export type EmptyStateProps = {
  icon?: ReactNode
  title: string
  description?: string
  action?: ReactNode
  className?: string
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-[var(--color-border)] bg-white px-6 py-14 text-center',
        className
      )}
      role="status"
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--color-muted)] text-[var(--color-wmsu-navy)]">
        {icon ?? <Inbox className="h-6 w-6" aria-hidden />}
      </div>
      <div className="space-y-1">
        <h3 className="text-base font-semibold text-[var(--color-ink)]">{title}</h3>
        {description ? <p className="max-w-md text-sm text-[var(--color-muted-foreground)]">{description}</p> : null}
      </div>
      {action}
    </div>
  )
}
