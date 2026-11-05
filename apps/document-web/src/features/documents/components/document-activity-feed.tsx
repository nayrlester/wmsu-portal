import { useMemo } from 'react'
import { formatDate } from '@/shared/utils'
import type { ActivityRecord } from '@/features/documents/types/document.types'

interface DocumentActivityFeedProps {
  activity: ActivityRecord[]
  loading: boolean
}

function actorLabel(entry: ActivityRecord): string {
  const user = entry.fromUser ?? entry.actor ?? entry.user
  return user?.fullName ?? user?.email ?? 'System'
}

function actionLabel(entry: ActivityRecord): string {
  if (entry.remarks) return entry.remarks
  return entry.action.replace(/_/g, ' ')
}

export function DocumentActivityFeed({ activity, loading }: DocumentActivityFeedProps) {
  const sorted = useMemo(
    () =>
      [...activity].sort(
        (a, b) =>
          new Date(b.occurredAt ?? b.createdAt ?? 0).getTime() -
          new Date(a.occurredAt ?? a.createdAt ?? 0).getTime()
      ),
    [activity]
  )

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading activity…</p>
  }

  if (!sorted.length) {
    return <p className="text-sm text-muted-foreground">No activity recorded yet.</p>
  }

  return (
    <ul className="space-y-4">
      {sorted.map((entry) => (
        <li key={entry.id} className="relative border-l border-border pl-4">
          <span className="absolute -left-1.5 top-1.5 h-3 w-3 rounded-full border-2 border-background bg-primary" />
          <p className="text-sm font-medium capitalize">{actionLabel(entry)}</p>
          <p className="text-xs text-muted-foreground">
            {actorLabel(entry)} · {formatDate(entry.occurredAt ?? entry.createdAt ?? new Date())}
          </p>
        </li>
      ))}
    </ul>
  )
}
