import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Inbox, Plus, Printer } from 'lucide-react'
import { PageContainer, ContentWrapper, WidgetCard } from '@/components/desk-app'
import { EmptyState } from '@/components/shared/status-badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DateField } from '@/components/ui/date-field'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import {
  useCreateReceivingReceipt,
  useReceivingReceipts,
} from '@/features/records/hooks/use-digitization-receiving'
import { formatDate } from '@/lib/utils'
import { toast } from '@/shared/store/toast-store'

const CHANNELS = [
  { value: 'walk_in', label: 'Walk-in' },
  { value: 'email', label: 'Email' },
  { value: 'courier', label: 'Courier' },
  { value: 'portal', label: 'Portal' },
  { value: 'internal', label: 'Internal' },
]

export function ReceivingDeskPage() {
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const date = params.get('date') ?? new Date().toISOString().slice(0, 10)
  const { data, isLoading } = useReceivingReceipts({ date })
  const create = useCreateReceivingReceipt()
  const [showForm, setShowForm] = useState(false)
  const [title, setTitle] = useState('')
  const [channel, setChannel] = useState('walk_in')
  const [senderName, setSenderName] = useState('')
  const [description, setDescription] = useState('')
  const [boxId, setBoxId] = useState('')
  const [folderId, setFolderId] = useState('')
  const rows = data?.data ?? []

  async function onCreate(e: React.FormEvent) {
    e.preventDefault()
    try {
      const result = await create.mutateAsync({
        title: title.trim(),
        channel,
        senderName: senderName.trim() || undefined,
        description: description.trim() || undefined,
        physicalBoxId: boxId.trim() || undefined,
        physicalFolderId: folderId.trim() || undefined,
      })
      toast.success('Receipt logged', result.data.receiptNumber)
      navigate(`/app/records/receiving/${result.data.id}`)
    } catch (err) {
      toast.error('Could not log receipt', err instanceof Error ? err.message : 'Unknown error')
    }
  }

  return (
    <PageContainer
      title="Receiving desk"
      breadcrumb="Home / Records / Receiving"
      description="Inbound channel log with printable receipt acknowledgment"
      action={
        <Button className="w-full sm:w-auto" size="sm" onClick={() => setShowForm((v) => !v)}>
          <Plus className="mr-1 h-4 w-4" />
          Log receipt
        </Button>
      }
    >
      <ContentWrapper>
        <WidgetCard title="Daily receiving log">
          <div className="mb-4 max-w-xs space-y-1.5">
            <Label htmlFor="log-date">Date</Label>
            <DateField
              id="log-date"
              value={date}
              onChange={(e) => {
                const next = new URLSearchParams(params)
                next.set('date', e.target.value)
                setParams(next)
              }}
            />
          </div>

          {showForm && (
            <form onSubmit={onCreate} className="mb-6 space-y-3 rounded-lg border border-border p-3 sm:p-4">
              <div className="space-y-2">
                <Label htmlFor="rcp-title">Document / parcel title</Label>
                <Input id="rcp-title" value={title} onChange={(e) => setTitle(e.target.value)} required minLength={3} />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="rcp-channel">Channel</Label>
                  <Select id="rcp-channel" value={channel} onChange={(e) => setChannel(e.target.value)}>
                    {CHANNELS.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="rcp-sender">Sender</Label>
                  <Input id="rcp-sender" value={senderName} onChange={(e) => setSenderName(e.target.value)} />
                </div>
                <div className="min-w-0 space-y-2">
                  <Label htmlFor="rcp-box">Physical box ID</Label>
                  <Input id="rcp-box" value={boxId} onChange={(e) => setBoxId(e.target.value)} />
                </div>
                <div className="min-w-0 space-y-2">
                  <Label htmlFor="rcp-folder">Physical folder ID</Label>
                  <Input id="rcp-folder" value={folderId} onChange={(e) => setFolderId(e.target.value)} />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="rcp-desc">Description</Label>
                <Textarea id="rcp-desc" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
              </div>
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={() => setShowForm(false)}>
                  Cancel
                </Button>
                <Button type="submit" className="w-full sm:w-auto" disabled={create.isPending}>
                  Save receipt
                </Button>
              </div>
            </form>
          )}

          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : !rows.length ? (
            <EmptyState
              icon={Inbox}
              title="No receipts for this day"
              description="Log walk-in, email, courier, or portal submissions."
            />
          ) : (
            <ul className="divide-y divide-border">
              {rows.map((row) => (
                <li
                  key={row.id}
                  className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        to={`/app/records/receiving/${row.id}`}
                        className="font-semibold text-primary hover:underline"
                      >
                        {row.receiptNumber}
                      </Link>
                      <Badge variant="outline">{row.channel.replaceAll('_', ' ')}</Badge>
                      <Badge variant="secondary">{row.status}</Badge>
                    </div>
                    <p className="text-sm break-words">{row.title}</p>
                    <p className="text-xs text-muted-foreground">{formatDate(row.receivedAt)}</p>
                  </div>
                  <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
                    <Link to={`/app/records/receiving/${row.id}`} className="w-full sm:w-auto">
                      <Button variant="outline" className="w-full">
                        Open
                      </Button>
                    </Link>
                    <Link to={`/app/records/receiving/${row.id}?print=1`} className="w-full sm:w-auto">
                      <Button variant="ghost" className="w-full">
                        <Printer className="mr-1 h-4 w-4" />
                        Print
                      </Button>
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </WidgetCard>
      </ContentWrapper>
    </PageContainer>
  )
}
