import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Plus, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { useAuthStore } from '@/stores/auth-store'
import { toast } from '@/lib/sweet-alert'
import {
  acknowledgeAcquisition,
  cancelAcquisition,
  createAcquisition,
  fetchAcquisitionDashboard,
  fetchAcquisitions,
  linkAcquisitionCatalog,
  routeAcquisition,
  submitAcquisition,
  type AcquisitionRequest,
  type AcquisitionStatus,
} from '@/lib/acquisitions-api'
import { cn } from '@/lib/utils'

const STATUS_TABS: Array<{ value: AcquisitionStatus | 'all'; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'draft', label: 'Draft' },
  { value: 'submitted', label: 'Submitted' },
  { value: 'routed', label: 'Routed' },
  { value: 'acknowledged', label: 'UFMS ref' },
  { value: 'cataloged', label: 'Cataloged' },
  { value: 'cancelled', label: 'Cancelled' },
]

function statusClass(status: AcquisitionStatus) {
  switch (status) {
    case 'draft':
      return 'bg-slate-100 text-slate-700'
    case 'submitted':
      return 'bg-amber-100 text-amber-800'
    case 'routed':
      return 'bg-indigo-100 text-indigo-800'
    case 'acknowledged':
      return 'bg-blue-100 text-blue-800'
    case 'cataloged':
      return 'bg-emerald-100 text-emerald-800'
    case 'cancelled':
      return 'bg-rose-100 text-rose-800'
    default:
      return 'bg-slate-100 text-slate-700'
  }
}

export function AcquisitionsPage() {
  const user = useAuthStore((s) => s.user)
  const qc = useQueryClient()
  const [statusFilter, setStatusFilter] = useState<AcquisitionStatus | 'all'>('all')
  const [search, setSearch] = useState('')
  const [localSearch, setLocalSearch] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const [selected, setSelected] = useState<AcquisitionRequest | null>(null)
  const [form, setForm] = useState({
    title: '',
    authors: '',
    isbn13: '',
    materialType: 'book',
    quantity: '1',
    justification: '',
    requestingUnit: '',
  })
  const [ufmsPrRef, setUfmsPrRef] = useState('')
  const [catalogBookId, setCatalogBookId] = useState('')

  const canCreate = user?.permissions.includes('acquisitions:create')
  const canSubmit = user?.permissions.includes('acquisitions:submit')
  const canRoute = user?.permissions.includes('acquisitions:route')
  const canCatalog = user?.permissions.includes('acquisitions:catalog')
  const canCancel = user?.permissions.includes('acquisitions:cancel')

  const { data: dashboard } = useQuery({
    queryKey: ['acquisitions-dashboard'],
    queryFn: fetchAcquisitionDashboard,
  })

  const { data, isLoading } = useQuery({
    queryKey: ['acquisitions', statusFilter, search],
    queryFn: () =>
      fetchAcquisitions({
        status: statusFilter === 'all' ? undefined : statusFilter,
        search: search || undefined,
        perPage: 25,
      }),
  })

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['acquisitions'] })
    qc.invalidateQueries({ queryKey: ['acquisitions-dashboard'] })
  }

  const createMut = useMutation({
    mutationFn: createAcquisition,
    onSuccess: (row) => {
      toast.success('Acquisition request created')
      setCreateOpen(false)
      setForm({
        title: '',
        authors: '',
        isbn13: '',
        materialType: 'book',
        quantity: '1',
        justification: '',
        requestingUnit: '',
      })
      setSelected(row)
      invalidate()
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? 'Create failed'),
  })

  const submitMut = useMutation({
    mutationFn: submitAcquisition,
    onSuccess: (row) => {
      toast.success('Submitted')
      setSelected(row)
      invalidate()
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? 'Submit failed'),
  })

  const routeMut = useMutation({
    mutationFn: routeAcquisition,
    onSuccess: (row) => {
      toast.success('Queued for UFMS procurement (INT-LIB-07)')
      setSelected(row)
      invalidate()
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? 'Route failed'),
  })

  const ackMut = useMutation({
    mutationFn: ({ id, ref }: { id: string; ref: string }) => acknowledgeAcquisition(id, ref),
    onSuccess: (row) => {
      toast.success('UFMS PR reference saved')
      setSelected(row)
      setUfmsPrRef('')
      invalidate()
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? 'Acknowledge failed'),
  })

  const catalogMut = useMutation({
    mutationFn: ({ id, bookId }: { id: string; bookId: string }) =>
      linkAcquisitionCatalog(id, bookId),
    onSuccess: (row) => {
      toast.success('Catalog record linked')
      setSelected(row)
      setCatalogBookId('')
      invalidate()
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? 'Link failed'),
  })

  const cancelMut = useMutation({
    mutationFn: (id: string) => cancelAcquisition(id),
    onSuccess: (row) => {
      toast.success('Cancelled')
      setSelected(row)
      invalidate()
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? 'Cancel failed'),
  })

  const items = data?.items ?? []
  const openItem = useMemo(() => {
    if (!selected) return null
    return items.find((i) => i.id === selected.id) ?? selected
  }, [items, selected])

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Acquisitions</h1>
          <p className="text-sm text-slate-500">
            Library purchase requests routed to UFMS Procurement (LIB-008 / INT-LIB-07)
          </p>
        </div>
        {canCreate && (
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            New request
          </Button>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5" data-testid="acquisitions-dashboard">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Draft</p>
            <p className="mt-1 text-2xl font-semibold">{dashboard?.draftCount ?? '—'}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-amber-600">Pending route</p>
            <p className="mt-1 text-2xl font-semibold">{dashboard?.pendingRouteCount ?? '—'}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-indigo-600">Routed</p>
            <p className="mt-1 text-2xl font-semibold">{dashboard?.routedCount ?? '—'}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-blue-600">UFMS ref</p>
            <p className="mt-1 text-2xl font-semibold">{dashboard?.acknowledgedCount ?? '—'}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-emerald-600">Cataloged</p>
            <p className="mt-1 text-2xl font-semibold">{dashboard?.catalogedCount ?? '—'}</p>
          </CardContent>
        </Card>
      </div>

      {dashboard?.ownershipNote && (
        <p className="text-xs text-slate-500" data-testid="acquisitions-ownership-note">
          {dashboard.ownershipNote}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => setStatusFilter(tab.value)}
            className={cn(
              'rounded-full px-3 py-1 text-sm font-medium transition-colors',
              statusFilter === tab.value
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          setSearch(localSearch)
        }}
      >
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            placeholder="Search title, ISBN, request number, UFMS PR…"
            className="pl-9"
          />
        </div>
        <Button type="submit" variant="outline">
          Search
        </Button>
      </form>

      <div className="space-y-3">
        {isLoading && <p className="text-sm text-slate-500">Loading…</p>}
        {!isLoading && items.length === 0 && (
          <p className="rounded-xl border border-dashed border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
            No acquisition requests yet.
          </p>
        )}
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setSelected(item)}
            className="flex w-full items-start justify-between gap-4 rounded-xl border border-slate-200 bg-white p-4 text-left hover:border-indigo-200"
          >
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium text-slate-900">{item.title}</span>
                <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', statusClass(item.status))}>
                  {item.status}
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-500">
                {item.requestNumber}
                {item.authors ? ` · ${item.authors}` : ''}
                {item.ufmsPrRef ? ` · UFMS ${item.ufmsPrRef}` : ''}
              </p>
            </div>
            <span className="text-xs text-slate-400">Qty {item.quantity}</span>
          </button>
        ))}
      </div>

      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} title="New acquisition request">
        <div className="space-y-3">
          <div>
            <Label htmlFor="acq-title">Title</Label>
            <Input
              id="acq-title"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            />
          </div>
          <div>
            <Label htmlFor="acq-authors">Authors</Label>
            <Input
              id="acq-authors"
              value={form.authors}
              onChange={(e) => setForm((f) => ({ ...f, authors: e.target.value }))}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="acq-isbn">ISBN-13</Label>
              <Input
                id="acq-isbn"
                value={form.isbn13}
                onChange={(e) => setForm((f) => ({ ...f, isbn13: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="acq-qty">Quantity</Label>
              <Input
                id="acq-qty"
                type="number"
                min={1}
                value={form.quantity}
                onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))}
              />
            </div>
          </div>
          <div>
            <Label htmlFor="acq-unit">Requesting unit</Label>
            <Input
              id="acq-unit"
              value={form.requestingUnit}
              onChange={(e) => setForm((f) => ({ ...f, requestingUnit: e.target.value }))}
            />
          </div>
          <div>
            <Label htmlFor="acq-just">Justification</Label>
            <Input
              id="acq-just"
              value={form.justification}
              onChange={(e) => setForm((f) => ({ ...f, justification: e.target.value }))}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={!form.title.trim() || createMut.isPending}
              onClick={() =>
                createMut.mutate({
                  title: form.title.trim(),
                  authors: form.authors || undefined,
                  isbn13: form.isbn13 || undefined,
                  materialType: form.materialType || undefined,
                  quantity: Number(form.quantity) || 1,
                  justification: form.justification || undefined,
                  requestingUnit: form.requestingUnit || undefined,
                })
              }
            >
              Create draft
            </Button>
          </div>
        </div>
      </Dialog>

      <Dialog
        open={!!openItem}
        onClose={() => setSelected(null)}
        title={openItem?.title ?? 'Acquisition request'}
      >
        {openItem && (
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              {openItem.requestNumber} ·{' '}
              <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', statusClass(openItem.status))}>
                {openItem.status}
              </span>
            </p>
            <dl className="grid gap-2 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-xs uppercase text-slate-400">Authors</dt>
                <dd>{openItem.authors || '—'}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase text-slate-400">Quantity</dt>
                <dd>{openItem.quantity}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase text-slate-400">UFMS PR</dt>
                <dd>{openItem.ufmsPrRef || '—'}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase text-slate-400">Catalog link</dt>
                <dd>
                  {openItem.catalogedBookId ? (
                    <Link className="text-indigo-600 hover:underline" to={`/books/${openItem.catalogedBookId}`}>
                      {openItem.catalogedBookTitle || openItem.catalogedBookId}
                    </Link>
                  ) : (
                    '—'
                  )}
                </dd>
              </div>
            </dl>
            {openItem.justification && (
              <p className="text-sm text-slate-600">{openItem.justification}</p>
            )}

            <div className="flex flex-wrap gap-2">
              {canSubmit && openItem.status === 'draft' && (
                <Button size="sm" onClick={() => submitMut.mutate(openItem.id)}>
                  Submit
                </Button>
              )}
              {canRoute && (openItem.status === 'draft' || openItem.status === 'submitted') && (
                <Button size="sm" onClick={() => routeMut.mutate(openItem.id)}>
                  Route to UFMS
                </Button>
              )}
              {canCancel && (openItem.status === 'draft' || openItem.status === 'submitted') && (
                <Button size="sm" variant="outline" onClick={() => cancelMut.mutate(openItem.id)}>
                  Cancel
                </Button>
              )}
            </div>

            {canRoute && (openItem.status === 'routed' || openItem.status === 'acknowledged') && (
              <div className="flex items-end gap-2">
                <div className="min-w-0 flex-1">
                  <Input
                    id="acq-ufms-pr"
                    label="UFMS PR number"
                    placeholder="PR-2026-0001"
                    value={ufmsPrRef}
                    onChange={(e) => setUfmsPrRef(e.target.value)}
                  />
                </div>
                <Button
                  size="sm"
                  disabled={!ufmsPrRef.trim() || ackMut.isPending}
                  onClick={() => ackMut.mutate({ id: openItem.id, ref: ufmsPrRef.trim() })}
                >
                  Save PR ref
                </Button>
              </div>
            )}

            {canCatalog &&
              (openItem.status === 'routed' ||
                openItem.status === 'acknowledged' ||
                openItem.status === 'cataloged') && (
                <div className="flex items-end gap-2">
                  <div className="min-w-0 flex-1">
                    <Input
                      id="acq-catalog-book"
                      label="Catalog book ID"
                      placeholder="Book UUID"
                      value={catalogBookId}
                      onChange={(e) => setCatalogBookId(e.target.value)}
                    />
                  </div>
                  <Button
                    size="sm"
                    disabled={!catalogBookId.trim() || catalogMut.isPending}
                    onClick={() =>
                      catalogMut.mutate({ id: openItem.id, bookId: catalogBookId.trim() })
                    }
                  >
                    Link catalog
                  </Button>
                </div>
              )}
          </div>
        )}
      </Dialog>
    </div>
  )
}
