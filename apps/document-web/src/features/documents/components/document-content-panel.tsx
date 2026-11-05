import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { DocumentRichEditor } from '@/features/documents/components/document-rich-editor'
import { useSaveDocumentContent } from '@/features/documents/hooks/use-documents'
import { sanitizeHtmlForDisplay } from '@/features/documents/utils/content-display'
import { toast } from '@/shared/store/toast-store'

interface DocumentContentPanelProps {
  documentId: string
  contentHtml?: string | null
  canEdit: boolean
  onClearWrittenNotes?: () => void
}

export function DocumentContentPanel({
  documentId,
  contentHtml,
  canEdit,
  onClearWrittenNotes,
}: DocumentContentPanelProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(contentHtml ?? '<p></p>')
  const [changeNotes, setChangeNotes] = useState('')
  const saveMutation = useSaveDocumentContent(documentId)

  useEffect(() => {
    setDraft(contentHtml ?? '<p></p>')
  }, [contentHtml])

  const handleSave = () => {
    saveMutation.mutate(
      { contentHtml: draft, changeNotes: changeNotes || undefined },
      {
        onSuccess: () => {
          setEditing(false)
          setChangeNotes('')
          toast.success('Content saved', 'A new document version was created.')
        },
        onError: () => toast.error('Save failed', 'Unable to save document content.'),
      }
    )
  }

  const handleRemoveWrittenNotes = () => {
    saveMutation.mutate(
      { contentHtml: '', changeNotes: 'Removed written notes' },
      {
        onSuccess: () => {
          setEditing(false)
          onClearWrittenNotes?.()
          toast.success('Written notes removed', 'Uploaded files were not changed.')
        },
        onError: () => toast.error('Remove failed', 'Unable to remove written notes.'),
      }
    )
  }

  if (!contentHtml && !canEdit) {
    return <p className="text-sm text-muted-foreground">No editor content for this document.</p>
  }

  if (editing) {
    return (
      <div className="space-y-4">
        <DocumentRichEditor value={draft} onChange={setDraft} />
        <div className="space-y-2">
          <Label htmlFor="content-change-notes">Change notes (optional)</Label>
          <Input
            id="content-change-notes"
            value={changeNotes}
            onChange={(e) => setChangeNotes(e.target.value)}
            placeholder="Describe what changed in this version"
          />
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={() => setEditing(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSave} disabled={saveMutation.isPending}>
            {saveMutation.isPending ? 'Saving…' : 'Save content'}
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {contentHtml ? (
        <div
          className="prose prose-sm dark:prose-invert max-w-none rounded-lg border border-border p-4"
          dangerouslySetInnerHTML={{ __html: sanitizeHtmlForDisplay(contentHtml) }}
        />
      ) : (
        <p className="text-sm text-muted-foreground">No content yet.</p>
      )}
      {canEdit && (
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={() => setEditing(true)}>
            {contentHtml ? 'Edit written content' : 'Add written content'}
          </Button>
          {contentHtml && (
            <Button
              type="button"
              variant="ghost"
              className="text-muted-foreground"
              onClick={handleRemoveWrittenNotes}
              disabled={saveMutation.isPending}
            >
              Remove written notes
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
