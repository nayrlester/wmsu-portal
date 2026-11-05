import { useEffect, useState } from 'react'
import { Download, Loader2 } from 'lucide-react'
import DOMPurify from 'dompurify'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { documentsApi } from '@/api/modules/documents.api'
import { normalizeAxiosError } from '@/api/errors/api-error'
import { formatBytes, formatDate } from '@/lib/utils'
import { getFilePreviewMode } from '@/features/documents/utils/file-preview'
import { formatActorName } from '@/features/documents/utils/format-actor-name'
import type { FileRecord } from '@/features/documents/types/document.types'

interface DocumentFileViewerDialogProps {
  documentId: string
  file: FileRecord | null
  extractedText?: string | null
  editedBy?: { fullName?: string | null; email?: string } | null
  editedAt?: string | null
  open: boolean
  canDownload: boolean
  /** When true, blocks browser print of the preview surface */
  restrictPrint?: boolean
  onClose: () => void
  onDownload?: (fileId: string) => void
}

export function DocumentFileViewerDialog({
  documentId,
  file,
  extractedText,
  editedBy,
  editedAt,
  open,
  canDownload,
  restrictPrint = false,
  onClose,
  onDownload,
}: DocumentFileViewerDialogProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [docxHtml, setDocxHtml] = useState<string | null>(null)

  useEffect(() => {
    if (!open || !file) {
      setPreviewUrl(null)
      setDocxHtml(null)
      setError('')
      return
    }

    let cancelled = false
    setLoading(true)
    setError('')
    setPreviewUrl(null)
    setDocxHtml(null)

    const previewMode = getFilePreviewMode(file.mimeType, file.originalName)

    ;(async () => {
      try {
        if (previewMode === 'docx-html') {
          const result = await documentsApi.previewHtml(documentId, file.id)
          if (cancelled) return
          const safeHtml = DOMPurify.sanitize(result.html, {
            USE_PROFILES: { html: true },
          })
          setDocxHtml(safeHtml || null)
          if (!safeHtml.trim() && !extractedText?.trim()) {
            setError('This Word document has no readable preview content.')
          }
          return
        }

        const { url } = await documentsApi.viewFile(documentId, file.id)
        if (cancelled) return
        setPreviewUrl(url)
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : normalizeAxiosError(err).message
          )
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [documentId, file, open, extractedText])

  if (!file) return null

  const previewMode = getFilePreviewMode(file.mimeType, file.originalName)
  const showDocxHtml = previewMode === 'docx-html' && Boolean(docxHtml?.trim())
  const showInlinePreview =
    Boolean(previewUrl) && previewMode !== 'text-fallback' && previewMode !== 'docx-html'
  const showExtractedText =
    !showDocxHtml && !showInlinePreview && Boolean(extractedText?.trim())

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={file.originalName}
      className="max-w-5xl"
      footer={
        <>
          <Button type="button" variant="outline" onClick={onClose}>
            Close
          </Button>
          {canDownload && onDownload && (
            <Button type="button" onClick={() => onDownload(file.id)}>
              <Download className="h-3.5 w-3.5" />
              Download
            </Button>
          )}
        </>
      }
    >
      <div className="mb-4 space-y-1 text-sm text-muted-foreground">
        <p>
          {file.mimeType} · {formatBytes(file.fileSize)}
        </p>
        {editedBy && (
          <p>
            Last edited by {formatActorName(editedBy)}
            {editedAt ? ` · ${formatDate(editedAt)}` : ''}
          </p>
        )}
      </div>

      {loading ? (
        <div className="flex items-center gap-2 py-16 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading file preview…
        </div>
      ) : error && !showDocxHtml && !showExtractedText ? (
        <p className="py-8 text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : showDocxHtml ? (
        <div className={restrictPrint ? 'print:hidden' : undefined}>
          {restrictPrint && (
            <p className="mb-2 text-xs text-amber-700 dark:text-amber-400">
              Printing is restricted for confidential/restricted records.
            </p>
          )}
          <div className="max-h-[70vh] overflow-auto rounded-lg border border-border bg-muted/40 p-3 sm:p-5">
            <article
              className="docx-preview mx-auto min-h-[50vh] max-w-3xl bg-white px-8 py-10 text-neutral-900 shadow-sm sm:px-12 sm:py-12 dark:bg-neutral-950 dark:text-neutral-100"
              dangerouslySetInnerHTML={{ __html: docxHtml! }}
            />
          </div>
        </div>
      ) : showInlinePreview && previewMode === 'image' ? (
        <img
          src={previewUrl!}
          alt={file.originalName}
          className={`max-h-[70vh] w-full rounded-lg border border-border object-contain${restrictPrint ? ' print:hidden' : ''}`}
        />
      ) : showInlinePreview ? (
        <div className={restrictPrint ? 'print:hidden' : undefined}>
          {restrictPrint && (
            <p className="mb-2 text-xs text-amber-700 dark:text-amber-400">
              Printing is restricted for confidential/restricted records. Use a watermarked download
              if you have clearance.
            </p>
          )}
          <iframe
            title={`Preview of ${file.originalName}`}
            src={previewUrl!}
            className="h-[70vh] w-full rounded-lg border border-border bg-background"
          />
          {restrictPrint && (
            <style>{`@media print { body * { visibility: hidden !important; } }`}</style>
          )}
        </div>
      ) : showExtractedText ? (
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Extracted text preview
          </p>
          <pre className="max-h-[70vh] overflow-auto rounded-lg border border-border bg-muted/30 p-4 text-sm whitespace-pre-wrap">
            {extractedText}
          </pre>
        </div>
      ) : (
        <div className="flex h-48 items-center justify-center rounded-lg border border-dashed border-border px-6 text-center text-sm text-muted-foreground">
          Inline preview is not available for this file type.
          {canDownload ? ' Use Download to open the original file.' : ''}
        </div>
      )}
    </Dialog>
  )
}
