import { DocumentTimeline as DeskDocumentTimeline } from '@/components/desk-app/documents/document-timeline'
import type { TimelineEntry } from '@/shared/types'

interface DocumentTimelineProps {
  entries: TimelineEntry[]
  loading: boolean
}

export function DocumentTimeline({ entries, loading }: DocumentTimelineProps) {
  return (
    <DeskDocumentTimeline
      loading={loading}
      entries={entries.map((entry) => ({
        id: entry.id,
        action: entry.action,
        actorName: entry.fromUser?.fullName ?? entry.fromUser?.email ?? null,
        remarks: entry.remarks,
        occurredAt: entry.routedAt,
      }))}
    />
  )
}
