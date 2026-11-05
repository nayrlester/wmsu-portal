import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import { apiClient } from '@/api/client'
import { apiRequest } from '@/api/utils/request'
import { toast } from '@/shared/store/toast-store'

type IntelligencePayload = {
  classification?: { category?: string; confidence?: number } | null
  summary?: string | null
  metadata?: {
    aiExtracted?: Record<string, unknown>
    correctedSearchText?: string
  } | null
}

export function DocumentMetadataCorrectionPanel({
  documentId,
  canEdit,
}: {
  documentId: string
  canEdit: boolean
}) {
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({
    queryKey: ['document-intelligence', documentId],
    queryFn: () =>
      apiRequest<IntelligencePayload>(
        apiClient.get(`/account/documents/${documentId}/intelligence`)
      ),
  })

  const extracted = useMemo(
    () => (data?.metadata?.aiExtracted ?? {}) as Record<string, unknown>,
    [data]
  )
  const [fields, setFields] = useState<Record<string, string>>({})
  const [searchText, setSearchText] = useState('')

  useEffect(() => {
    const next: Record<string, string> = {}
    for (const [key, value] of Object.entries(extracted)) {
      next[key] = value == null ? '' : String(value)
    }
    setFields(next)
    setSearchText(data?.metadata?.correctedSearchText ?? '')
  }, [extracted, data?.metadata?.correctedSearchText])

  const saveMutation = useMutation({
    mutationFn: () =>
      apiRequest(
        apiClient.put(`/account/documents/${documentId}/intelligence/metadata`, {
          fields,
          searchText: searchText.trim() || undefined,
        })
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['document-intelligence', documentId] })
      qc.invalidateQueries({ queryKey: ['documents', documentId] })
      toast.success('Metadata corrected and re-indexed')
    },
    onError: (err) => {
      toast.error('Correction failed', err instanceof Error ? err.message : undefined)
    },
  })

  if (isLoading) return <Skeleton className="h-28 w-full" />

  const keys = Object.keys(fields)
  const hasContent = keys.length > 0 || Boolean(data?.summary)

  if (!hasContent && !canEdit) {
    return <p className="text-sm text-muted-foreground">No OCR/AI metadata yet.</p>
  }

  return (
    <div className="space-y-3">
      {data?.classification?.category && (
        <p className="text-xs text-muted-foreground">
          Classified as <span className="font-medium">{data.classification.category}</span>
          {typeof data.classification.confidence === 'number'
            ? ` (${Math.round(data.classification.confidence * 100)}%)`
            : ''}
        </p>
      )}
      {data?.summary && (
        <p className="text-sm text-muted-foreground line-clamp-3">{data.summary}</p>
      )}

      {keys.length === 0 && canEdit && (
        <p className="text-sm text-muted-foreground">
          No extracted fields yet. Run intelligence analysis, then correct values here.
        </p>
      )}

      {keys.map((key) => (
        <div key={key} className="space-y-1">
          <Label htmlFor={`meta-${key}`}>{key}</Label>
          <Input
            id={`meta-${key}`}
            value={fields[key] ?? ''}
            disabled={!canEdit}
            onChange={(e) => setFields((prev) => ({ ...prev, [key]: e.target.value }))}
          />
        </div>
      ))}

      {canEdit && (
        <>
          <div className="space-y-1">
            <Label htmlFor="meta-search">Search text override</Label>
            <Textarea
              id="meta-search"
              rows={3}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="Optional OCR text corrections for search"
            />
          </div>
          <Button
            size="sm"
            disabled={saveMutation.isPending}
            onClick={() => saveMutation.mutate()}
          >
            Save metadata corrections
          </Button>
        </>
      )}
    </div>
  )
}
