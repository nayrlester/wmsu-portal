import { useState } from 'react'
import { ChevronDown, ChevronUp, FilePenLine } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { contentPreview, sanitizeHtmlForDisplay } from '@/features/documents/utils/content-display'
import { cn } from '@/lib/utils'

interface VersionContentPreviewProps {
  contentHtml: string
  compact?: boolean
}

export function VersionContentPreview({ contentHtml, compact = false }: VersionContentPreviewProps) {
  const [expanded, setExpanded] = useState(!compact)
  const preview = contentPreview(contentHtml, 140)

  return (
    <div className="rounded-md border border-border/70 bg-background/60">
      <div className="flex items-start justify-between gap-3 px-3 py-2">
        <div className="flex min-w-0 items-start gap-2">
          <FilePenLine className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
          <div className="min-w-0">
            <p className="text-xs font-medium text-foreground">Written notes</p>
            {!expanded && <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{preview}</p>}
          </div>
        </div>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-7 shrink-0 px-2 text-xs"
          onClick={() => setExpanded((value) => !value)}
        >
          {expanded ? (
            <>
              Collapse <ChevronUp className="ml-1 h-3.5 w-3.5" />
            </>
          ) : (
            <>
              View <ChevronDown className="ml-1 h-3.5 w-3.5" />
            </>
          )}
        </Button>
      </div>
      {expanded && (
        <div
          className={cn(
            'prose prose-sm dark:prose-invert max-w-none border-t border-border/60 px-3 py-3',
            compact && 'max-h-64 overflow-y-auto'
          )}
          dangerouslySetInnerHTML={{ __html: sanitizeHtmlForDisplay(contentHtml) }}
        />
      )}
    </div>
  )
}

function formatSourceType(sourceType?: string): string | null {
  if (!sourceType || sourceType === 'upload') return 'Files'
  if (sourceType === 'editor') return 'Written'
  if (sourceType === 'mixed') return 'Mixed'
  return sourceType
}

export function VersionSourceBadge({ sourceType }: { sourceType?: string }) {
  const label = formatSourceType(sourceType)
  if (!label) return null

  return (
    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
      {label}
    </span>
  )
}
