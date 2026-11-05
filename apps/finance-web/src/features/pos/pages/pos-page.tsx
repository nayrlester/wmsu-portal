import { useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { DataTable } from '@/components/ui/data-table'
import { Badge } from '@/components/ui/badge'
import { PageHeader } from '@/components/ui/page-chrome'
import { getApiErrorMessage } from '@/lib/api-client'
import { formatCurrency, cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/auth-store'
import {
  closeEod,
  completeSale,
  createCatalogItem,
  createSale,
  fetchCashierReport,
  fetchCatalog,
  fetchSales,
  fetchStockSnapshots,
  voidSale,
} from '../api/pos-api'

type Tab = 'sell' | 'catalog' | 'history' | 'stock' | 'eod'

function hasPerm(permissions: string[], code: string) {
  return permissions.includes('*') || permissions.includes(code)
}

function statusVariant(status: string): 'success' | 'danger' | 'warning' | 'default' {
  if (status === 'completed') return 'success'
  if (status === 'voided') return 'danger'
  if (status === 'draft') return 'warning'
  return 'default'
}

export function PosPage() {
  const queryClient = useQueryClient()
  const permissions = useAuthStore((s) => s.user?.permissions ?? [])
  const canWrite = hasPerm(permissions, 'pos.write')
  const canSell = hasPerm(permissions, 'pos.sell')
  const canVoid = hasPerm(permissions, 'pos.void')
  const canEod = hasPerm(permissions, 'pos.close_day')

  const [tab, setTab] = useState<Tab>('sell')
  const [error, setError] = useState<string | null>(null)
  const [cart, setCart] = useState<Array<{ catalogItemId: string; description: string; unitPrice: number; quantity: number }>>(
    []
  )
  const [tenderCash, setTenderCash] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [lastReceipt, setLastReceipt] = useState<any>(null)
  const [showCatalog, setShowCatalog] = useState(false)
  const [voidId, setVoidId] = useState<string | null>(null)
  const [voidReason, setVoidReason] = useState('')
  const [catalogForm, setCatalogForm] = useState({
    itemCode: '',
    description: '',
    category: '',
    unitPrice: '',
    taxPercent: '0',
    discountPercent: '0',
  })

  const catalogQuery = useQuery({ queryKey: ['pos-catalog'], queryFn: fetchCatalog })
  const salesQuery = useQuery({
    queryKey: ['pos-sales'],
    queryFn: fetchSales,
    enabled: tab === 'history',
  })
  const reportQuery = useQuery({
    queryKey: ['pos-report'],
    queryFn: fetchCashierReport,
    enabled: tab === 'eod' || tab === 'sell',
  })
  const stockQuery = useQuery({
    queryKey: ['pos-stock'],
    queryFn: fetchStockSnapshots,
    enabled: tab === 'stock',
  })

  async function wrap(fn: () => Promise<unknown>) {
    setError(null)
    try {
      await fn()
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['pos-catalog'] }),
        queryClient.invalidateQueries({ queryKey: ['pos-sales'] }),
        queryClient.invalidateQueries({ queryKey: ['pos-report'] }),
        queryClient.invalidateQueries({ queryKey: ['pos-stock'] }),
      ])
    } catch (err) {
      setError(getApiErrorMessage(err))
      throw err
    }
  }

  const cartTotal = useMemo(() => {
    return cart.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0)
  }, [cart])

  function addToCart(item: any) {
    setCart((prev) => {
      const existing = prev.find((l) => l.catalogItemId === item.id)
      if (existing) {
        return prev.map((l) =>
          l.catalogItemId === item.id ? { ...l, quantity: l.quantity + 1 } : l
        )
      }
      return [
        ...prev,
        {
          catalogItemId: item.id,
          description: item.description,
          unitPrice: Number(item.unitPrice),
          quantity: 1,
        },
      ]
    })
  }

  async function checkout() {
    if (!cart.length || submitting) return
    setSubmitting(true)
    try {
      await wrap(async () => {
        const draft = await createSale({
          lines: cart.map((l) => ({
            catalogItemId: l.catalogItemId,
            quantity: l.quantity,
          })),
        })
        const cash = Number(tenderCash || draft.totalAmount)
        const completed = await completeSale(draft.id, [
          { paymentMethod: 'cash', amount: cash },
        ])
        setLastReceipt(completed.receiptSnapshot || completed)
        setCart([])
        setTenderCash('')
      })
    } finally {
      setSubmitting(false)
    }
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: 'sell', label: 'Sell' },
    { id: 'catalog', label: 'Catalog' },
    { id: 'history', label: 'History' },
    { id: 'stock', label: 'UIMS stock' },
    { id: 'eod', label: 'EOD / Reports' },
  ]

  return (
    <div className="space-y-4 animate-fade-up">
      <PageHeader
        title="Point of Sale"
        description="Catalog, multi-tender sales, receipts, EOD, and UIMS-sourced stock cache (FIN-017/018/019/030). No parallel UFMS inventory."
        actions={
          tab === 'catalog' && canWrite ? (
            <Button onClick={() => setShowCatalog(true)}>
              <Plus className="h-4 w-4" /> Catalog item
            </Button>
          ) : null
        }
      />

      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-2">
        {tabs.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={cn(
              'rounded-lg px-3 py-1.5 text-sm font-medium',
              tab === item.id ? 'bg-[var(--color-brand)] text-white' : 'text-slate-600 hover:bg-slate-100'
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
          {error}
        </div>
      )}

      {tab === 'sell' && (
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <h2 className="mb-3 text-sm font-semibold text-slate-700">Catalog</h2>
            <div className="grid max-h-[28rem] gap-2 overflow-y-auto sm:grid-cols-2">
              {(catalogQuery.data ?? []).map((item: any) => (
                <button
                  key={item.id}
                  type="button"
                  disabled={!canSell}
                  onClick={() => addToCart(item)}
                  className="rounded-lg border border-slate-200 p-3 text-left hover:border-[var(--color-brand)]"
                >
                  <div className="font-mono text-xs text-slate-500">{item.itemCode}</div>
                  <div className="text-sm font-medium text-slate-900">{item.description}</div>
                  <div className="mt-1 text-sm text-slate-700">{formatCurrency(item.unitPrice)}</div>
                </button>
              ))}
              {!catalogQuery.data?.length && (
                <p className="col-span-2 text-sm text-slate-500">No active catalog items.</p>
              )}
            </div>
          </div>

          <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
            <h2 className="text-sm font-semibold text-slate-700">Cart</h2>
            {cart.map((line) => (
              <div key={line.catalogItemId} className="flex items-center justify-between text-sm">
                <span>
                  {line.description} × {line.quantity}
                </span>
                <span>{formatCurrency(line.unitPrice * line.quantity)}</span>
              </div>
            ))}
            {!cart.length && <p className="text-sm text-slate-500">Cart is empty.</p>}
            <div className="border-t border-slate-100 pt-2 text-sm font-semibold">
              Est. total (before tax/discount from catalog): {formatCurrency(cartTotal)}
            </div>
            <Input
              placeholder="Cash tendered"
              value={tenderCash}
              onChange={(e) => setTenderCash(e.target.value)}
              aria-label="Cash tendered"
            />
            <Button className="w-full" disabled={!canSell || !cart.length || submitting} onClick={checkout}>
              {submitting ? 'Processing…' : 'Complete sale'}
            </Button>
            {lastReceipt && (
              <div className="rounded-lg bg-slate-50 p-3 text-xs text-slate-700">
                <div className="font-semibold">Receipt {lastReceipt.receiptNumber}</div>
                <div>Total {formatCurrency(lastReceipt.totalAmount)}</div>
                <div>Change {formatCurrency(lastReceipt.changeAmount)}</div>
              </div>
            )}
            {reportQuery.data && (
              <p className="text-xs text-slate-500">
                Today: {reportQuery.data.completedSales} sales / {formatCurrency(reportQuery.data.grossSales)}
              </p>
            )}
          </div>
        </div>
      )}

      {tab === 'catalog' && (
        <DataTable
          label="Catalog"
          columns={[
            { key: 'code', header: 'Code', className: 'font-mono text-xs', render: (r: any) => r.itemCode },
            { key: 'desc', header: 'Description', render: (r: any) => r.description },
            { key: 'cat', header: 'Category', render: (r: any) => r.category || '—' },
            { key: 'price', header: 'Price', render: (r: any) => formatCurrency(r.unitPrice) },
            {
              key: 'inv',
              header: 'UIMS ref',
              render: (r: any) => (r.tracksInventory ? r.uimsItemRef || '—' : '—'),
            },
          ]}
          data={catalogQuery.data ?? []}
          keyExtractor={(r: any) => r.id}
          loading={catalogQuery.isLoading}
          emptyTitle="No catalog items"
        />
      )}

      {tab === 'history' && (
        <DataTable
          label="Sales history"
          columns={[
            { key: 'sale', header: 'Sale#', className: 'font-mono text-xs', render: (r: any) => r.saleNumber },
            { key: 'receipt', header: 'Receipt', render: (r: any) => r.receiptNumber || '—' },
            { key: 'total', header: 'Total', render: (r: any) => formatCurrency(r.totalAmount) },
            {
              key: 'status',
              header: 'Status',
              render: (r: any) => <Badge variant={statusVariant(r.status)}>{r.status}</Badge>,
            },
            {
              key: 'actions',
              header: 'Actions',
              render: (r: any) =>
                r.status === 'completed' && canVoid ? (
                  <Button size="sm" variant="outline" onClick={() => setVoidId(r.id)}>
                    Void
                  </Button>
                ) : null,
            },
          ]}
          data={salesQuery.data ?? []}
          keyExtractor={(r: any) => r.id}
          loading={salesQuery.isLoading}
          emptyTitle="No sales yet"
        />
      )}

      {tab === 'stock' && (
        <div className="space-y-2">
          <p className="text-sm text-slate-600">
            Snapshots are a UIMS cache only (FIN-019). UFMS does not maintain a parallel inventory master.
          </p>
          <DataTable
            label="UIMS stock snapshots"
            columns={[
              { key: 'ref', header: 'UIMS ref', className: 'font-mono text-xs', render: (r: any) => r.uimsItemRef },
              { key: 'qty', header: 'Qty on hand', render: (r: any) => r.quantityOnHand },
              { key: 'uom', header: 'UOM', render: (r: any) => r.uom || '—' },
              {
                key: 'at',
                header: 'Sourced',
                render: (r: any) => String(r.sourcedAt).slice(0, 19),
              },
            ]}
            data={stockQuery.data ?? []}
            keyExtractor={(r: any) => r.id}
            loading={stockQuery.isLoading}
            emptyTitle="No stock snapshots"
          />
        </div>
      )}

      {tab === 'eod' && (
        <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
          <div className="text-sm text-slate-700">
            Today’s completed sales: {reportQuery.data?.completedSales ?? '—'} /{' '}
            {formatCurrency(reportQuery.data?.grossSales ?? 0)}
          </div>
          {canEod && (
            <Button
              onClick={() =>
                wrap(async () => {
                  await closeEod({ businessDate: new Date().toISOString().slice(0, 10) })
                })
              }
            >
              Close end of day
            </Button>
          )}
        </div>
      )}

      <Modal open={showCatalog} onClose={() => setShowCatalog(false)} title="Add catalog item">
        <div className="space-y-3">
          <Input
            placeholder="Item code"
            value={catalogForm.itemCode}
            onChange={(e) => setCatalogForm({ ...catalogForm, itemCode: e.target.value })}
          />
          <Input
            placeholder="Description"
            value={catalogForm.description}
            onChange={(e) => setCatalogForm({ ...catalogForm, description: e.target.value })}
          />
          <Input
            placeholder="Category"
            value={catalogForm.category}
            onChange={(e) => setCatalogForm({ ...catalogForm, category: e.target.value })}
          />
          <Input
            placeholder="Unit price"
            value={catalogForm.unitPrice}
            onChange={(e) => setCatalogForm({ ...catalogForm, unitPrice: e.target.value })}
          />
          <div className="grid grid-cols-2 gap-2">
            <Input
              placeholder="Tax %"
              value={catalogForm.taxPercent}
              onChange={(e) => setCatalogForm({ ...catalogForm, taxPercent: e.target.value })}
            />
            <Input
              placeholder="Discount %"
              value={catalogForm.discountPercent}
              onChange={(e) => setCatalogForm({ ...catalogForm, discountPercent: e.target.value })}
            />
          </div>
          <Button
            className="w-full"
            onClick={() =>
              wrap(async () => {
                await createCatalogItem({
                  ...catalogForm,
                  unitPrice: Number(catalogForm.unitPrice),
                  taxPercent: Number(catalogForm.taxPercent),
                  discountPercent: Number(catalogForm.discountPercent),
                })
                setShowCatalog(false)
              })
            }
          >
            Save item
          </Button>
        </div>
      </Modal>

      <Modal open={!!voidId} onClose={() => setVoidId(null)} title="Void sale">
        <div className="space-y-3">
          <Input
            placeholder="Reason"
            value={voidReason}
            onChange={(e) => setVoidReason(e.target.value)}
          />
          <Button
            className="w-full"
            onClick={() =>
              wrap(async () => {
                if (!voidId) return
                await voidSale(voidId, voidReason)
                setVoidId(null)
                setVoidReason('')
              })
            }
          >
            Confirm void
          </Button>
        </div>
      </Modal>
    </div>
  )
}
