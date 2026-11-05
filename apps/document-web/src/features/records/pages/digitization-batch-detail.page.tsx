import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { PageContainer, ContentWrapper, WidgetCard } from '@/components/desk-app'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  useDigitizationBatch,
  useDigitizationMutations,
} from '@/features/records/hooks/use-digitization-receiving'
import { useDocuments } from '@/features/documents/hooks/use-documents'
import { toast } from '@/shared/store/toast-store'
import type { DigitizationItem } from '@/api/modules/digitization-receiving.api'

export function DigitizationBatchDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data, isLoading } = useDigitizationBatch(id)
  const batch = data?.data
  const mutations = useDigitizationMutations(id!)
  const { data: docsData } = useDocuments({ limit: 50 })

  const [label, setLabel] = useState('')
  const [documentId, setDocumentId] = useState('')
  const [boxId, setBoxId] = useState('')
  const [folderId, setFolderId] = useState('')

  if (isLoading || !batch) {
    return (
      <PageContainer title="Digitization batch" breadcrumb="Home / Records / Digitization">
        <ContentWrapper>
          <Skeleton className="h-40 w-full" />
        </ContentWrapper>
      </PageContainer>
    )
  }

  async function addItem(e: React.FormEvent) {
    e.preventDefault()
    try {
      await mutations.addItem.mutateAsync({
        label: label.trim(),
        documentId: documentId || undefined,
        physicalBoxId: boxId || undefined,
        physicalFolderId: folderId || undefined,
      })
      setLabel('')
      setDocumentId('')
      setBoxId('')
      setFolderId('')
      toast.success('Item added')
    } catch (err) {
      toast.error('Failed to add item', err instanceof Error ? err.message : 'Unknown error')
    }
  }

  return (
    <PageContainer
      title={batch.batchNumber}
      breadcrumb="Home / Records / Digitization / Board"
      description={batch.title}
      action={
        <Button variant="outline" className="w-full sm:w-auto" onClick={() => navigate('/app/records/digitization')}>
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back
        </Button>
      }
    >
      <ContentWrapper>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <Stat label="Queued" value={batch.board.queued} />
          <Stat label="OCR" value={batch.board.ocrRunning} />
          <Stat label="QA pending" value={batch.board.qaPending} />
          <Stat label="Passed" value={batch.board.qaPassed} />
          <Stat label="Failed" value={batch.board.qaFailed} />
          <Stat label="Total" value={batch.board.total} />
        </div>

        {batch.status !== 'completed' && batch.status !== 'cancelled' && (
          <WidgetCard title="Add scan item">
            <form onSubmit={addItem} className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="item-label">Label</Label>
                <Input
                  id="item-label"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  required
                  minLength={2}
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="item-doc">Link document (optional)</Label>
                <select
                  id="item-doc"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={documentId}
                  onChange={(e) => setDocumentId(e.target.value)}
                >
                  <option value="">— None —</option>
                  {(docsData?.data ?? []).map((doc) => (
                    <option key={doc.id} value={doc.id}>
                      {doc.trackingNumber} · {doc.title}
                    </option>
                  ))}
                </select>
              </div>
              <div className="min-w-0 space-y-2">
                <Label htmlFor="box">Physical box ID</Label>
                <Input id="box" value={boxId} onChange={(e) => setBoxId(e.target.value)} />
              </div>
              <div className="min-w-0 space-y-2">
                <Label htmlFor="folder">Physical folder ID</Label>
                <Input id="folder" value={folderId} onChange={(e) => setFolderId(e.target.value)} />
              </div>
              <div className="sm:col-span-2">
                <Button type="submit" className="w-full sm:w-auto" disabled={mutations.addItem.isPending}>
                  Add to board
                </Button>
              </div>
            </form>
          </WidgetCard>
        )}

        <WidgetCard title="OCR / QA status board">
          {!batch.items?.length ? (
            <p className="text-sm text-muted-foreground">No items yet.</p>
          ) : (
            <ul className="space-y-4">
              {batch.items.map((item) => (
                <BatchItemCard
                  key={item.id}
                  item={item}
                  disabled={batch.status === 'completed'}
                  onIngest={(files) =>
                    mutations.ingest
                      .mutateAsync({ itemId: item.id, files })
                      .then(() => toast.success('Pages ingested — OCR complete'))
                  }
                  onOcr={() =>
                    mutations.runOcr
                      .mutateAsync(item.id)
                      .then(() => toast.success('OCR finished — ready for QA'))
                  }
                  onQa={(payload) =>
                    mutations.submitQa
                      .mutateAsync({ itemId: item.id, ...payload })
                      .then(() => toast.success('QA saved'))
                  }
                />
              ))}
            </ul>
          )}
        </WidgetCard>

        {batch.status !== 'completed' && (
          <div className="flex justify-stretch sm:justify-end">
            <Button
              className="w-full sm:w-auto"
              disabled={mutations.complete.isPending}
              onClick={() =>
                mutations.complete
                  .mutateAsync()
                  .then(() => toast.success('Batch completed'))
                  .catch((err) =>
                    toast.error('Cannot complete', err instanceof Error ? err.message : 'Unknown error')
                  )
              }
            >
              Complete batch
            </Button>
          </div>
        )}
      </ContentWrapper>
    </PageContainer>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="min-w-0 rounded-lg border border-border p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-semibold">{value}</p>
    </div>
  )
}

function BatchItemCard({
  item,
  disabled,
  onIngest,
  onOcr,
  onQa,
}: {
  item: DigitizationItem
  disabled: boolean
  onIngest: (files: File[]) => Promise<unknown>
  onOcr: () => Promise<unknown>
  onQa: (payload: {
    ocrQaStatus: string
    physicalBoxId?: string
    physicalFolderId?: string
    checklist?: Array<{ key: string; done: boolean }>
    qaNotes?: string
  }) => Promise<unknown>
}) {
  const [checklist, setChecklist] = useState(item.indexingChecklist)
  const [boxId, setBoxId] = useState(item.physicalBoxId ?? '')
  const [folderId, setFolderId] = useState(item.physicalFolderId ?? '')
  const [notes, setNotes] = useState(item.qaNotes ?? '')
  const [busy, setBusy] = useState(false)

  const allDone = useMemo(() => checklist.every((c) => c.done), [checklist])
  const confidencePct =
    typeof item.ocrConfidence === 'number' ? Math.round(item.ocrConfidence * 100) : null

  async function handleFiles(fileList: FileList | null) {
    if (!fileList?.length) return
    setBusy(true)
    try {
      await onIngest(Array.from(fileList))
    } catch (e) {
      toast.error('Ingest failed', e instanceof Error ? e.message : 'Error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <li className="rounded-lg border border-border p-3 sm:p-4 space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="font-medium break-words">{item.label}</p>
          {item.document?.trackingNumber && (
            <Link
              to={`/app/documents/${item.document.id}`}
              className="text-xs font-mono text-primary hover:underline"
            >
              {item.document.trackingNumber}
            </Link>
          )}
          <div className="mt-1 flex flex-wrap gap-2 text-xs text-muted-foreground">
            {confidencePct !== null && (
              <span className={confidencePct < 60 ? 'text-destructive' : ''}>
                OCR confidence {confidencePct}%
              </span>
            )}
            {item.pageCount != null && <span>{item.pageCount} page(s)</span>}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline">{item.status.replaceAll('_', ' ')}</Badge>
          <Badge variant={item.ocrQaStatus === 'passed' ? 'default' : 'secondary'}>
            QA {item.ocrQaStatus}
          </Badge>
        </div>
      </div>

      {!disabled && item.status !== 'linked' && (
        <div className="space-y-3">
          {(item.status === 'queued' || item.status === 'ocr_running' || !item.primaryFileId) && (
            <div className="space-y-2">
              <Label htmlFor={`scan-${item.id}`}>Capture / upload pages (JPEG, PNG, or PDF)</Label>
              <Input
                id={`scan-${item.id}`}
                type="file"
                accept="image/*,application/pdf,image/jpeg,image/png"
                capture="environment"
                multiple
                disabled={busy}
                onChange={(e) => handleFiles(e.target.files)}
              />
              {item.primaryFileId && (
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full sm:w-auto"
                  disabled={busy}
                  onClick={() =>
                    onOcr().catch((e) => toast.error(String(e)))
                  }
                >
                  Re-run OCR
                </Button>
              )}
            </div>
          )}

          {(item.status === 'qa_pending' || item.status === 'qa_failed') && (
            <>
              <div className="space-y-2">
                <p className="text-sm font-medium">Indexing checklist</p>
                {checklist.map((c) => (
                  <label key={c.key} className="flex items-start gap-2 text-sm">
                    <input
                      type="checkbox"
                      className="mt-0.5"
                      checked={c.done}
                      onChange={(e) =>
                        setChecklist((prev) =>
                          prev.map((x) => (x.key === c.key ? { ...x, done: e.target.checked } : x))
                        )
                      }
                    />
                    <span>{c.label}</span>
                  </label>
                ))}
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="min-w-0 space-y-1">
                  <Label>Box ID</Label>
                  <Input value={boxId} onChange={(e) => setBoxId(e.target.value)} />
                </div>
                <div className="min-w-0 space-y-1">
                  <Label>Folder ID</Label>
                  <Input value={folderId} onChange={(e) => setFolderId(e.target.value)} />
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <Label>QA notes</Label>
                  <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
                </div>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button
                  size="sm"
                  className="w-full sm:w-auto"
                  disabled={!allDone || !boxId.trim()}
                  onClick={() =>
                    onQa({
                      ocrQaStatus: 'passed',
                      physicalBoxId: boxId.trim(),
                      physicalFolderId: folderId.trim() || undefined,
                      checklist: checklist.map(({ key, done }) => ({ key, done })),
                      qaNotes: notes.trim() || undefined,
                    }).catch((e) => toast.error('QA failed', e instanceof Error ? e.message : 'Error'))
                  }
                >
                  Pass QA & link
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  className="w-full sm:w-auto"
                  onClick={() =>
                    onQa({
                      ocrQaStatus: 'failed',
                      qaNotes: notes.trim() || 'QA failed',
                      checklist: checklist.map(({ key, done }) => ({ key, done })),
                    }).catch((e) => toast.error(String(e)))
                  }
                >
                  Fail QA
                </Button>
              </div>
            </>
          )}
        </div>
      )}
    </li>
  )
}
