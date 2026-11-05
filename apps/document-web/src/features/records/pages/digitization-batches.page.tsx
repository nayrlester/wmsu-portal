import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ScanLine, Plus } from 'lucide-react'
import { PageContainer, ContentWrapper, WidgetCard } from '@/components/desk-app'
import { EmptyState } from '@/components/shared/status-badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import {
  useCreateDigitizationBatch,
  useDigitizationBatches,
} from '@/features/records/hooks/use-digitization-receiving'
import { formatDate } from '@/lib/utils'
import { toast } from '@/shared/store/toast-store'

export function DigitizationBatchesPage() {
  const navigate = useNavigate()
  const { data, isLoading } = useDigitizationBatches()
  const create = useCreateDigitizationBatch()
  const [title, setTitle] = useState('')
  const [notes, setNotes] = useState('')
  const [showForm, setShowForm] = useState(false)
  const rows = data?.data ?? []

  async function onCreate(e: React.FormEvent) {
    e.preventDefault()
    if (title.trim().length < 3) {
      toast.error('Title required', 'Enter at least 3 characters.')
      return
    }
    try {
      const result = await create.mutateAsync({
        title: title.trim(),
        notes: notes.trim() || undefined,
      })
      toast.success('Batch created', result.data.batchNumber)
      navigate(`/app/records/digitization/${result.data.id}`)
    } catch (err) {
      toast.error('Could not create batch', err instanceof Error ? err.message : 'Unknown error')
    }
  }

  return (
    <PageContainer
      title="Digitization ops"
      breadcrumb="Home / Records / Digitization"
      description="Batch scan intake with OCR / indexing QA status board"
      action={
        <Button className="w-full sm:w-auto" size="sm" onClick={() => setShowForm((v) => !v)}>
          <Plus className="mr-1 h-4 w-4" />
          New batch
        </Button>
      }
    >
      <ContentWrapper>
        {showForm && (
          <WidgetCard title="Create digitization batch">
            <form onSubmit={onCreate} className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="batch-title">Title</Label>
                <Input
                  id="batch-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. March memo scan batch"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="batch-notes">Notes</Label>
                <Textarea
                  id="batch-notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                />
              </div>
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={() => setShowForm(false)}>
                  Cancel
                </Button>
                <Button type="submit" className="w-full sm:w-auto" disabled={create.isPending}>
                  Create batch
                </Button>
              </div>
            </form>
          </WidgetCard>
        )}

        <WidgetCard title="Batches">
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : !rows.length ? (
            <EmptyState
              icon={ScanLine}
              title="No digitization batches"
              description="Create a batch to track scan intake and OCR QA."
            />
          ) : (
            <ul className="divide-y divide-border">
              {rows.map((batch) => (
                <li
                  key={batch.id}
                  className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        to={`/app/records/digitization/${batch.id}`}
                        className="font-semibold text-primary hover:underline"
                      >
                        {batch.batchNumber}
                      </Link>
                      <Badge variant="outline">{batch.status}</Badge>
                    </div>
                    <p className="text-sm break-words">{batch.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {batch.board.total} item(s) · QA pending {batch.board.qaPending} ·{' '}
                      {formatDate(batch.createdAt)}
                    </p>
                  </div>
                  <Link to={`/app/records/digitization/${batch.id}`} className="w-full sm:w-auto">
                    <Button variant="outline" className="w-full sm:w-auto">
                      Open board
                    </Button>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </WidgetCard>
      </ContentWrapper>
    </PageContainer>
  )
}
