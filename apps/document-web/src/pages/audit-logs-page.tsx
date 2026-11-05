import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useDebouncedValue } from '@/shared/hooks/use-debounced-value'
import { PageContainer, ContentWrapper } from '@/components/layout/page-container'
import { DataTable } from '@/components/desk/data-table'
import { Input } from '@/components/ui/input'
import { useDocuments, useDocumentActivity } from '@/hooks/use-api'
import { formatDate } from '@/lib/utils'
import type { DocumentRecord } from '@/types/api'
import type { ActivityRecord } from '@/lib/api'

export function AuditLogsPage() {
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebouncedValue(search, 300)
  const { data: docs, isLoading } = useDocuments({ search: debouncedSearch || undefined, limit: 20 })
  const { data: activities, isLoading: activityLoading } = useDocumentActivity(selectedDocId ?? undefined)

  return (
    <PageContainer
      title="Audit Logs"
      breadcrumb="Home / Audit Logs"
      description="Activity timeline across documents (via document activity API)"
    >
      <ContentWrapper>
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="desk-card p-4">
            <h3 className="mb-3 font-semibold">Select document</h3>
            <Input
              placeholder="Filter documents…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="mb-3"
            />
            <DataTable<DocumentRecord>
              loading={isLoading}
              data={docs?.data ?? []}
              keyExtractor={(d) => d.id}
              onRowClick={(d) => setSelectedDocId(d.id)}
              emptyMessage="No documents"
              columns={[
                { key: 'trackingNumber', header: 'Tracking', render: (d) => <span className="font-mono text-xs">{d.trackingNumber}</span> },
                { key: 'title', header: 'Title', render: (d) => d.title },
              ]}
            />
          </div>

          <div className="desk-card p-4">
            <h3 className="mb-3 font-semibold">Activity timeline</h3>
            {!selectedDocId ? (
              <p className="text-sm text-muted-foreground">Select a document to view its audit trail.</p>
            ) : activityLoading ? (
              <p className="text-sm text-muted-foreground">Loading activity…</p>
            ) : !activities?.length ? (
              <p className="text-sm text-muted-foreground">No activity recorded.</p>
            ) : (
              <ol className="relative space-y-4 border-l border-border pl-6">
                {activities.map((a: ActivityRecord) => (
                  <li key={a.id} className="relative">
                    <span className="absolute -left-[1.65rem] top-1 h-3 w-3 rounded-full border-2 border-primary bg-card" />
                    <p className="text-sm font-medium capitalize">{a.action.replace(/_/g, ' ')}</p>
                    {a.remarks && <p className="text-sm text-muted-foreground">{a.remarks}</p>}
                    <p className="text-xs text-muted-foreground">
                      {a.user?.fullName ?? a.actor?.fullName ?? a.user?.email ?? a.actor?.email ?? 'System'} ·{' '}
                      {formatDate(a.occurredAt ?? a.createdAt ?? '')}
                    </p>
                  </li>
                ))}
              </ol>
            )}
            {selectedDocId && (
              <Link to={`/app/documents/${selectedDocId}`} className="mt-4 inline-block text-sm text-primary hover:underline">
                Open document details →
              </Link>
            )}
          </div>
        </div>
      </ContentWrapper>
    </PageContainer>
  )
}
