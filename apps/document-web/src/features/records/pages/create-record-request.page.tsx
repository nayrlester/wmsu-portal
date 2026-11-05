import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { FolderOpen, Plus } from 'lucide-react'
import { PageContainer, ContentWrapper, WidgetCard } from '@/components/desk-app'
import { EmptyState } from '@/components/shared/status-badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DateTimeField } from '@/components/ui/date-field'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { useDocuments } from '@/features/documents/hooks/use-documents'
import { useCreateRecordRequest } from '@/features/records/hooks/use-record-requests'
import { toast } from '@/shared/store/toast-store'

function toIso(localValue: string): string | undefined {
  if (!localValue) return undefined
  const date = new Date(localValue)
  if (Number.isNaN(date.getTime())) return undefined
  return date.toISOString()
}

export function CreateRecordRequestPage() {
  const navigate = useNavigate()
  const create = useCreateRecordRequest()
  const { data: documentsData, isLoading: docsLoading } = useDocuments({ limit: 50 })
  const documents = documentsData?.data ?? []

  const [purpose, setPurpose] = useState('')
  const [accessMode, setAccessMode] = useState<'view_only' | 'download' | 'physical_checkout'>(
    'view_only'
  )
  const [neededBy, setNeededBy] = useState('')
  const [dueAt, setDueAt] = useState('')
  const [notes, setNotes] = useState('')
  const [selected, setSelected] = useState<string[]>([])
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return documents
    return documents.filter(
      (doc) =>
        doc.title.toLowerCase().includes(q) ||
        doc.trackingNumber.toLowerCase().includes(q)
    )
  }, [documents, search])

  function toggle(id: string) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (purpose.trim().length < 8) {
      toast.error('Purpose required', 'Enter at least 8 characters.')
      return
    }
    if (!selected.length) {
      toast.error('Select records', 'Choose at least one document.')
      return
    }
    try {
      const result = await create.mutateAsync({
        purpose: purpose.trim(),
        accessMode,
        neededBy: toIso(neededBy),
        dueAt: toIso(dueAt),
        notes: notes.trim() || undefined,
        documentIds: selected,
      })
      toast.success('Request submitted', result.data.requestNumber)
      navigate(`/app/records/requests/${result.data.id}`)
    } catch (err) {
      toast.error('Could not submit request', err instanceof Error ? err.message : 'Unknown error')
    }
  }

  return (
    <PageContainer
      title="Request records"
      breadcrumb="Home / Records / Request"
      description="Request access or physical release of registered records"
      action={
        <Link to="/app/records/requests" className="w-full sm:w-auto">
          <Button variant="outline" className="w-full sm:w-auto">
            My requests
          </Button>
        </Link>
      }
    >
      <ContentWrapper>
        <form onSubmit={onSubmit} className="space-y-6">
          <WidgetCard title="Request details">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="purpose">Purpose</Label>
                <Textarea
                  id="purpose"
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  placeholder="Official purpose for requesting these records"
                  rows={3}
                  required
                  className="w-full"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="accessMode">Access mode</Label>
                <Select
                  id="accessMode"
                  value={accessMode}
                  onChange={(e) =>
                    setAccessMode(e.target.value as 'view_only' | 'download' | 'physical_checkout')
                  }
                >
                  <option value="view_only">View only</option>
                  <option value="download">Download</option>
                  <option value="physical_checkout">Physical checkout</option>
                </Select>
              </div>
              <div className="min-w-0 space-y-2">
                <Label htmlFor="neededBy-date">Needed by</Label>
                <DateTimeField
                  id="neededBy"
                  value={neededBy}
                  onChange={setNeededBy}
                  aria-label="Needed by"
                />
              </div>
              <div className="min-w-0 space-y-2 sm:col-span-2">
                <Label htmlFor="dueAt-date">Proposed return due</Label>
                <DateTimeField
                  id="dueAt"
                  value={dueAt}
                  onChange={setDueAt}
                  aria-label="Proposed return due"
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  className="w-full"
                />
              </div>
            </div>
          </WidgetCard>

          <WidgetCard title={`Select records (${selected.length})`}>
            <div className="mb-3">
              <Input
                className="w-full"
                placeholder="Search title / tracking #"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            {docsLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : !filtered.length ? (
              <EmptyState
                icon={FolderOpen}
                title="No documents found"
                description="Create or register documents before requesting release."
              />
            ) : (
              <ul className="max-h-80 divide-y divide-border overflow-y-auto sm:max-h-96">
                {filtered.map((doc) => {
                  const checked = selected.includes(doc.id)
                  return (
                    <li key={doc.id} className="flex items-start gap-3 py-3">
                      <input
                        type="checkbox"
                        className="mt-1 h-4 w-4 shrink-0"
                        checked={checked}
                        onChange={() => toggle(doc.id)}
                        aria-label={`Select ${doc.title}`}
                      />
                      <div className="min-w-0">
                        <p className="font-medium break-words">{doc.title}</p>
                        <p className="text-xs font-mono text-muted-foreground break-all">
                          {doc.trackingNumber}
                        </p>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </WidgetCard>

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              className="w-full sm:w-auto"
              onClick={() => navigate(-1)}
            >
              Cancel
            </Button>
            <Button type="submit" className="w-full sm:w-auto" disabled={create.isPending}>
              <Plus className="mr-1 h-4 w-4" />
              {create.isPending ? 'Submitting…' : 'Submit request'}
            </Button>
          </div>
        </form>
      </ContentWrapper>
    </PageContainer>
  )
}
