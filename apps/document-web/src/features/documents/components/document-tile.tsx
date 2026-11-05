import { Lock, Globe } from 'lucide-react'
import { StatusBadge } from '@/components/shared/status-badge'
import { formatDate } from '@/shared/utils'
import { cn } from '@/lib/utils'
import { DocumentFileIcon } from '@/features/documents/utils/document-file-icon'
import type { DocumentRecord } from '@/shared/types'

interface DocumentTileProps {
  document: DocumentRecord
  selected?: boolean
  searchTerm?: string
  onClick: () => void
}

export function DocumentTile({ document, selected, onClick }: DocumentTileProps) {
  const isPrivate = document.visibility === 'private'

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'desk-card flex h-full flex-col gap-3 p-4 text-left transition hover:border-primary/40 hover:shadow-sm',
        selected && 'border-primary ring-1 ring-primary/30'
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
          <DocumentFileIcon
            primaryFile={document.primaryFile ?? document.files?.[0]}
            sourceType={document.sourceType}
            hasContent={document.hasContent}
          />
        </div>
        {isPrivate ? (
          <Lock className="h-4 w-4 text-muted-foreground" aria-label="Private" />
        ) : (
          <Globe className="h-4 w-4 text-emerald-600" aria-label="Public" />
        )}
      </div>
      <div className="min-w-0 flex-1 space-y-1">
        <p className="line-clamp-2 text-sm font-semibold">{document.title}</p>
        <p className="truncate font-mono text-xs text-muted-foreground">{document.trackingNumber}</p>
      </div>
      <div className="flex items-center justify-between gap-2">
        <StatusBadge status={document.status} />
        <span className="text-xs text-muted-foreground">{formatDate(document.createdAt)}</span>
      </div>
    </button>
  )
}
