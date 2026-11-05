import { cn, formatDate } from '@/lib/utils'

export interface DocumentTimelineEntry {
  id: string
  action: string
  actorName?: string | null
  remarks?: string | null
  occurredAt: string
}

export interface DocumentTimelineProps {
  entries: DocumentTimelineEntry[]
  loading?: boolean
  emptyMessage?: string
  className?: string
}

export function DocumentTimeline({
  entries,
  loading,
  emptyMessage = 'No timeline events yet.',
  className,
}: DocumentTimelineProps) {
  if (loading) {
    return <p className={cn('text-sm text-muted-foreground', className)}>Loading timeline…</p>
  }

  if (!entries.length) {
    return <p className={cn('text-sm text-muted-foreground', className)}>{emptyMessage}</p>
  }

  return (
    <ol className={cn('relative space-y-6 border-l border-border pl-6', className)}>
      {entries.map((entry) => (
        <li key={entry.id} className="relative">
          <span className="absolute -left-[1.6rem] top-1 h-3 w-3 rounded-full border-2 border-primary bg-background" />
          <p className="font-medium capitalize">{entry.action.replace(/_/g, ' ')}</p>
          {entry.actorName && (
            <p className="text-xs text-muted-foreground">{entry.actorName}</p>
          )}
          {entry.remarks && <p className="mt-1 text-sm text-muted-foreground">{entry.remarks}</p>}
          <time className="mt-1 block text-xs text-muted-foreground">
            {formatDate(entry.occurredAt)}
          </time>
        </li>
      ))}
    </ol>
  )
}
