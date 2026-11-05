import { Skeleton } from '@/components/ui/skeleton'
import { StatusBadge } from '@/components/shared/status-badge'
import { DocumentFilesPanel } from '@/features/documents/components/document-files-panel'
import { useDocument } from '@/features/documents/hooks/use-documents'
import { formatDate } from '@/shared/utils'
import { formatActorName } from '@/features/documents/utils/format-actor-name'

interface DocumentDetailsPaneProps {
  documentId: string
}

export function DocumentDetailsPane({ documentId }: DocumentDetailsPaneProps) {
  const { data: document, isLoading, error } = useDocument(documentId)

  if (isLoading) {
    return (
      <div className="space-y-4 p-4">
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-24 w-full" />
      </div>
    )
  }

  if (error || !document) {
    return <p className="p-4 text-sm text-destructive">Unable to load document details.</p>
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <div className="space-y-3 border-b border-border p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="truncate text-lg font-semibold">{document.title}</h2>
            <p className="font-mono text-xs text-muted-foreground">{document.trackingNumber}</p>
          </div>
          <StatusBadge status={document.status} />
        </div>
        {document.description && (
          <p className="text-sm text-muted-foreground">{document.description}</p>
        )}
        <dl className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <dt className="text-muted-foreground">Created</dt>
            <dd>{formatDate(document.createdAt)}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Last edited by</dt>
            <dd>{formatActorName(document.lastEditedBy ?? document.createdBy)}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Priority</dt>
            <dd className="capitalize">{document.priority}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Privacy</dt>
            <dd className="capitalize">{document.visibility ?? 'private'}</dd>
          </div>
        </dl>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        <DocumentFilesPanel
          documentId={document.id}
          documentOwnerId={document.createdBy?.id}
          contentHtml={document.contentHtml}
          documentStatus={document.status}
          canEdit={false}
          canDelete={false}
          canDownload={false}
          preview
        />
      </div>
    </div>
  )
}
