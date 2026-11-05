import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog } from '@/components/ui/dialog'
import { documentsApi } from '@/api/modules/documents.api'
import { normalizeAxiosError } from '@/api/errors/api-error'
import type { FileEditPayload } from '@/features/documents/types/document.types'

interface DocumentFileEditorDialogProps {
  documentId: string
  fileId: string | null
  open: boolean
  onClose: () => void
  onSaved: () => void
}

export function DocumentFileEditorDialog({
  documentId,
  fileId,
  open,
  onClose,
  onSaved,
}: DocumentFileEditorDialogProps) {
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [payload, setPayload] = useState<FileEditPayload | null>(null)
  const [content, setContent] = useState('')
  const [sheets, setSheets] = useState<Array<{ name: string; csv: string }>>([])
  const [changeNotes, setChangeNotes] = useState('')

  useEffect(() => {
    if (!open || !fileId) {
      setPayload(null)
      setContent('')
      setSheets([])
      setChangeNotes('')
      setError('')
      return
    }

    let cancelled = false
    setLoading(true)
    setError('')

    documentsApi
      .getFileEdit(documentId, fileId)
      .then((data) => {
        if (cancelled) return
        setPayload(data)
        setContent(data.content ?? '')
        setSheets(data.sheets ?? [])
      })
      .catch((err) => {
        if (!cancelled) setError(normalizeAxiosError(err).message)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [documentId, fileId, open])

  const handleSave = async () => {
    if (!fileId || !payload) return
    setSaving(true)
    setError('')
    try {
      await documentsApi.saveFileEdit(documentId, fileId, {
        content: payload.mode === 'text' || payload.mode === 'extracted_text' ? content : undefined,
        sheets: payload.mode === 'spreadsheet' ? sheets : undefined,
        changeNotes: changeNotes || undefined,
      })
      onSaved()
      onClose()
    } catch (err) {
      setError(normalizeAxiosError(err).message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={payload ? `Edit ${payload.originalName}` : 'Edit content'}
      className="max-w-3xl"
      footer={
        <>
          <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSave} disabled={saving || loading || !payload}>
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving…
              </>
            ) : (
              'Save content'
            )}
          </Button>
        </>
      }
    >
      <p className="mb-4 text-sm text-muted-foreground">
        {payload?.preservesOriginalFile ? (
          <>
            Edits update the <strong>searchable text preview</strong> only. The downloaded PDF or
            image stays identical.
          </>
        ) : (
          <>
            Changes are saved as a new document version and update the file itself (
            {payload?.outputFileName ?? 'TXT, CSV, Word, Excel, etc.'}).
          </>
        )}
      </p>

      {loading ? (
        <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading file content…
        </div>
      ) : error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : payload?.mode === 'spreadsheet' ? (
        <div className="space-y-4">
          {sheets.map((sheet, index) => (
            <div key={sheet.name} className="space-y-2">
              <Label htmlFor={`sheet-${index}`}>{sheet.name}</Label>
              <Textarea
                id={`sheet-${index}`}
                rows={12}
                value={sheet.csv}
                onChange={(e) =>
                  setSheets((current) =>
                    current.map((item, itemIndex) =>
                      itemIndex === index ? { ...item, csv: e.target.value } : item
                    )
                  )
                }
                className="font-mono text-xs"
              />
            </div>
          ))}
        </div>
      ) : (
        <Textarea
          rows={16}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="font-mono text-sm"
          aria-label="File content"
        />
      )}

      {!loading && payload && (
        <div className="mt-4 space-y-2">
          <Label htmlFor="file-edit-notes">Version notes (optional)</Label>
          <Input
            id="file-edit-notes"
            value={changeNotes}
            onChange={(e) => setChangeNotes(e.target.value)}
            placeholder="Describe what you changed"
          />
        </div>
      )}
    </Dialog>
  )
}
