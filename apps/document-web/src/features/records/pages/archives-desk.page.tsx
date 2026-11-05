import { useState } from 'react'
import { PageContainer, ContentWrapper, WidgetCard } from '@/components/desk-app'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  useArchivalTransfers,
  useArchivesMutations,
  useDisposalRequests,
} from '@/features/records/hooks/use-archives'
import { useDocuments } from '@/features/documents/hooks/use-documents'
import { toast } from '@/shared/store/toast-store'

export function ArchivesDeskPage() {
  const { data: transfers, isLoading: transfersLoading } = useArchivalTransfers()
  const { data: disposals, isLoading: disposalsLoading } = useDisposalRequests()
  const { data: docsData } = useDocuments({ limit: 50 })
  const mutations = useArchivesMutations()

  const [transferTitle, setTransferTitle] = useState('')
  const [transferDocs, setTransferDocs] = useState<string[]>([])
  const [disposalTitle, setDisposalTitle] = useState('')
  const [justification, setJustification] = useState('')
  const [disposalDocs, setDisposalDocs] = useState<string[]>([])

  const docs = docsData?.data ?? []

  async function createTransfer(e: React.FormEvent) {
    e.preventDefault()
    try {
      await mutations.createTransfer.mutateAsync({
        title: transferTitle.trim(),
        documentIds: transferDocs,
      })
      setTransferTitle('')
      setTransferDocs([])
      toast.success('Archival transfer created')
    } catch (err) {
      toast.error('Transfer failed', err instanceof Error ? err.message : 'Unknown error')
    }
  }

  async function createDisposal(e: React.FormEvent) {
    e.preventDefault()
    try {
      await mutations.createDisposal.mutateAsync({
        title: disposalTitle.trim(),
        justification: justification.trim(),
        documentIds: disposalDocs,
      })
      setDisposalTitle('')
      setJustification('')
      setDisposalDocs([])
      toast.success('Disposal request created')
    } catch (err) {
      toast.error('Disposal failed', err instanceof Error ? err.message : 'Unknown error')
    }
  }

  function toggleDoc(list: string[], id: string, setter: (v: string[]) => void) {
    setter(list.includes(id) ? list.filter((x) => x !== id) : [...list, id])
  }

  return (
    <PageContainer
      title="Archives & Disposal"
      breadcrumb="Home / Records / Archives"
      description="Archival transfers, disposal authority, and legal hold controls"
    >
      <ContentWrapper>
        <Tabs defaultValue="transfers">
          <TabsList>
            <TabsTrigger value="transfers">Transfers</TabsTrigger>
            <TabsTrigger value="disposals">Disposals</TabsTrigger>
          </TabsList>

          <TabsContent value="transfers" className="space-y-4">
            <WidgetCard title="New archival transfer">
              <form onSubmit={createTransfer} className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="transfer-title">Title</Label>
                  <Input
                    id="transfer-title"
                    value={transferTitle}
                    onChange={(e) => setTransferTitle(e.target.value)}
                    required
                    minLength={3}
                  />
                </div>
                <DocPicker
                  docs={docs}
                  selected={transferDocs}
                  onToggle={(id) => toggleDoc(transferDocs, id, setTransferDocs)}
                />
                <Button
                  type="submit"
                  disabled={!transferDocs.length || mutations.createTransfer.isPending}
                >
                  Create transfer
                </Button>
              </form>
            </WidgetCard>

            <WidgetCard title="Transfer queue">
              {transfersLoading ? (
                <Skeleton className="h-24 w-full" />
              ) : !transfers?.data.length ? (
                <p className="text-sm text-muted-foreground">No transfers yet.</p>
              ) : (
                <ul className="space-y-3">
                  {transfers.data.map((t) => (
                    <li key={t.id} className="rounded-lg border border-border p-3 space-y-2">
                      <div className="flex flex-wrap items-center gap-2 justify-between">
                        <div>
                          <p className="font-medium">{t.transferNumber}</p>
                          <p className="text-sm text-muted-foreground">{t.title}</p>
                        </div>
                        <Badge variant="outline">{t.status.replaceAll('_', ' ')}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {t.items.length} document(s)
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {t.status === 'pending_approval' && (
                          <Button
                            size="sm"
                            onClick={() =>
                              mutations.approveTransfer
                                .mutateAsync(t.id)
                                .then(() => toast.success('Transfer approved'))
                                .catch((e) => toast.error(String(e)))
                            }
                          >
                            Approve
                          </Button>
                        )}
                        {(t.status === 'approved' || t.status === 'pending_approval') && (
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() =>
                              mutations.completeTransfer
                                .mutateAsync(t.id)
                                .then(() => toast.success('Transfer completed — records archived'))
                                .catch((e) => toast.error(String(e)))
                            }
                          >
                            Complete & archive
                          </Button>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </WidgetCard>
          </TabsContent>

          <TabsContent value="disposals" className="space-y-4">
            <WidgetCard title="New disposal request">
              <form onSubmit={createDisposal} className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="disposal-title">Title</Label>
                  <Input
                    id="disposal-title"
                    value={disposalTitle}
                    onChange={(e) => setDisposalTitle(e.target.value)}
                    required
                    minLength={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="justification">Justification</Label>
                  <Textarea
                    id="justification"
                    value={justification}
                    onChange={(e) => setJustification(e.target.value)}
                    required
                    minLength={10}
                    rows={3}
                  />
                </div>
                <DocPicker
                  docs={docs}
                  selected={disposalDocs}
                  onToggle={(id) => toggleDoc(disposalDocs, id, setDisposalDocs)}
                />
                <Button
                  type="submit"
                  disabled={!disposalDocs.length || mutations.createDisposal.isPending}
                >
                  Create disposal request
                </Button>
              </form>
            </WidgetCard>

            <WidgetCard title="Disposal queue">
              {disposalsLoading ? (
                <Skeleton className="h-24 w-full" />
              ) : !disposals?.data.length ? (
                <p className="text-sm text-muted-foreground">No disposal requests yet.</p>
              ) : (
                <ul className="space-y-3">
                  {disposals.data.map((d) => (
                    <li key={d.id} className="rounded-lg border border-border p-3 space-y-2">
                      <div className="flex flex-wrap items-center gap-2 justify-between">
                        <div>
                          <p className="font-medium">{d.requestNumber}</p>
                          <p className="text-sm text-muted-foreground">{d.title}</p>
                        </div>
                        <Badge variant="outline">{d.status.replaceAll('_', ' ')}</Badge>
                      </div>
                      {d.certificateNumber && (
                        <p className="text-xs font-mono">Certificate: {d.certificateNumber}</p>
                      )}
                      <div className="flex flex-wrap gap-2">
                        {d.status === 'pending' && (
                          <Button
                            size="sm"
                            onClick={() =>
                              mutations.approveDisposal
                                .mutateAsync(d.id)
                                .then(() => toast.success('Disposal approved'))
                                .catch((e) => toast.error(String(e)))
                            }
                          >
                            Approve
                          </Button>
                        )}
                        {(d.status === 'approved' || d.status === 'pending') && (
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() =>
                              mutations.executeDisposal
                                .mutateAsync({ id: d.id })
                                .then(() => toast.success('Disposal executed'))
                                .catch((e) => toast.error(String(e)))
                            }
                          >
                            Execute disposal
                          </Button>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </WidgetCard>
          </TabsContent>
        </Tabs>
      </ContentWrapper>
    </PageContainer>
  )
}

function DocPicker({
  docs,
  selected,
  onToggle,
}: {
  docs: Array<{ id: string; title: string; trackingNumber: string }>
  selected: string[]
  onToggle: (id: string) => void
}) {
  return (
    <div className="max-h-48 space-y-1 overflow-y-auto rounded-md border border-border p-2">
      <p className="mb-1 text-xs text-muted-foreground">Select documents</p>
      {docs.map((doc) => (
        <label key={doc.id} className="flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            className="mt-0.5"
            checked={selected.includes(doc.id)}
            onChange={() => onToggle(doc.id)}
          />
          <span className="min-w-0 break-words">
            <span className="font-mono text-xs">{doc.trackingNumber}</span> · {doc.title}
          </span>
        </label>
      ))}
    </div>
  )
}
