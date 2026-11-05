import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Plus,
  ArrowDownRight,
  ArrowUpRight,
  Minus,
  ArrowLeftRight,
  RotateCcw,
  Trash2,
  Lock,
  Unlock,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Modal } from '@/components/ui/modal'
import { DataTable } from '@/components/ui/data-table'
import { Badge } from '@/components/ui/badge'
import { Spinner } from '@/components/ui/spinner'
import { getApiErrorMessage } from '@/lib/api-client'
import { formatNumber } from '@/lib/utils'
import { fetchStockMovements, fetchStockBalances, createStockMovement } from '../api/stock-api'
import type { StockMovement, StockMovementFormData, StockBalance } from '../types'
import type { Column } from '@/components/ui/data-table'
import { cn } from '@/lib/utils'

const movementSchema = z.object({
  itemId: z.string().min(1, 'Item is required'),
  warehouseId: z.string().min(1, 'Warehouse is required'),
  type: z.enum(['IN', 'OUT', 'ADJUST', 'RETURN', 'DISPOSAL', 'RESERVE', 'RELEASE']),
  quantity: z.number().min(1, 'Quantity must be at least 1'),
  reference: z.string(),
  notes: z.string(),
})

type Tab = 'movements' | 'balances'

function TypeBadge({ type }: { type: string }) {
  const map: Record<string, { variant: 'success' | 'danger' | 'warning' | 'default'; icon: typeof ArrowDownRight; label: string }> = {
    IN: { variant: 'success', icon: ArrowDownRight, label: 'Receipt' },
    OUT: { variant: 'danger', icon: ArrowUpRight, label: 'Issue' },
    ADJUST: { variant: 'warning', icon: Minus, label: 'Adjust' },
    RETURN: { variant: 'success', icon: RotateCcw, label: 'Return' },
    DISPOSAL: { variant: 'danger', icon: Trash2, label: 'Disposal' },
    RESERVE: { variant: 'warning', icon: Lock, label: 'Reserve' },
    RELEASE: { variant: 'default', icon: Unlock, label: 'Release' },
  }
  const cfg = map[type] ?? map.ADJUST
  const Icon = cfg.icon
  return (
    <Badge variant={cfg.variant}>
      <Icon className="mr-1 h-3 w-3" /> {cfg.label}
    </Badge>
  )
}

const typeOptions = [
  { value: '', label: 'All Types' },
  { value: 'IN', label: 'Receipt (IN)' },
  { value: 'OUT', label: 'Issue (OUT)' },
  { value: 'ADJUST', label: 'Adjustment' },
  { value: 'RETURN', label: 'Return' },
  { value: 'DISPOSAL', label: 'Disposal' },
  { value: 'RESERVE', label: 'Reserve' },
  { value: 'RELEASE', label: 'Release' },
]

const movementColumns: Column<StockMovement>[] = [
  {
    key: 'createdAt',
    header: 'Date',
    render: (m) => new Date(m.createdAt).toLocaleDateString(),
  },
  { key: 'type', header: 'Type', render: (m) => <TypeBadge type={m.type} /> },
  {
    key: 'itemName',
    header: 'Item',
    render: (m) => (
      <div>
        <span className="font-medium">{m.itemName}</span>
        <span className="ml-2 text-xs text-muted-foreground">{m.itemSku}</span>
      </div>
    ),
  },
  { key: 'warehouseName', header: 'Warehouse' },
  {
    key: 'quantity',
    header: 'Qty',
    className: 'text-right',
    render: (m) => {
      const prefix = m.type === 'IN' || m.type === 'RETURN' || m.type === 'RELEASE' ? '+' : m.type === 'OUT' || m.type === 'DISPOSAL' || m.type === 'RESERVE' ? '-' : '±'
      const color =
        m.type === 'IN' || m.type === 'RETURN' || m.type === 'RELEASE'
          ? 'text-emerald-600'
          : m.type === 'OUT' || m.type === 'DISPOSAL' || m.type === 'RESERVE'
            ? 'text-red-600'
            : 'text-amber-600'
      return <span className={`font-semibold ${color}`}>{prefix}{formatNumber(m.quantity)}</span>
    },
  },
  {
    key: 'reference',
    header: 'Reference',
    render: (m) => m.reference || <span className="text-muted-foreground">—</span>,
  },
  { key: 'createdBy', header: 'By' },
]

const balanceColumns: Column<StockBalance>[] = [
  {
    key: 'itemName',
    header: 'Item',
    render: (b) => (
      <div>
        <span className="font-medium">{b.itemName}</span>
        <span className="ml-2 text-xs text-muted-foreground">{b.itemSku}</span>
      </div>
    ),
  },
  { key: 'warehouseName', header: 'Warehouse' },
  { key: 'binCode', header: 'Bin', render: (b) => b.binCode || '—' },
  {
    key: 'quantityOnHand',
    header: 'On Hand',
    className: 'text-right',
    render: (b) => formatNumber(b.quantityOnHand),
  },
  {
    key: 'quantityReserved',
    header: 'Reserved',
    className: 'text-right',
    render: (b) => formatNumber(b.quantityReserved),
  },
  {
    key: 'quantityAvailable',
    header: 'Available',
    className: 'text-right',
    render: (b) => (
      <span className={b.quantityAvailable <= b.reorderLevel ? 'font-semibold text-amber-600' : 'font-semibold'}>
        {formatNumber(b.quantityAvailable)}
      </span>
    ),
  },
]

export function StockPage() {
  const queryClient = useQueryClient()
  const [tab, setTab] = useState<Tab>('movements')
  const [typeFilter, setTypeFilter] = useState('')
  const [showForm, setShowForm] = useState(false)

  const { data: movementsData, isLoading: movementsLoading } = useQuery({
    queryKey: ['stock-movements', { type: typeFilter }],
    queryFn: () => fetchStockMovements({ type: typeFilter || undefined }),
    enabled: tab === 'movements',
  })

  const { data: balancesData, isLoading: balancesLoading } = useQuery({
    queryKey: ['stock-balances'],
    queryFn: () => fetchStockBalances(),
    enabled: tab === 'balances',
  })

  const movements = movementsData?.data ?? []
  const balances = balancesData?.data ?? []

  return (
    <div className="space-y-4 animate-fade-up">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1>Stock</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">Track movements, balances, returns, and reserves</p>
        </div>
        {tab === 'movements' && (
          <Button onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4" /> Record Movement
          </Button>
        )}
      </div>

      <div className="flex gap-1 rounded-full bg-[var(--color-primary-soft)] p-1 w-fit">
        {([
          { id: 'movements' as const, label: 'Movements' },
          { id: 'balances' as const, label: 'Balances' },
        ]).map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              'rounded-full px-4 py-1.5 text-sm font-medium transition',
              tab === t.id
                ? 'bg-white text-[var(--color-ink)] shadow-sm'
                : 'text-[var(--color-muted-foreground)] hover:text-[var(--color-ink)]',
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'movements' && (
        <>
          <div className="flex items-center gap-3">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="h-9 rounded-md border border-border bg-white px-3 text-sm text-ink shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            >
              {typeOptions.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          <DataTable
            columns={movementColumns}
            data={movements}
            keyExtractor={(m) => m.id}
            loading={movementsLoading}
            emptyIcon={<ArrowLeftRight className="h-12 w-12" />}
            emptyTitle="No stock movements"
            emptyDescription="Record your first stock movement to begin tracking inventory flow."
          />
        </>
      )}

      {tab === 'balances' && (
        <DataTable
          columns={balanceColumns}
          data={balances}
          keyExtractor={(b) => b.id}
          loading={balancesLoading}
          emptyIcon={<ArrowLeftRight className="h-12 w-12" />}
          emptyTitle="No stock balances"
          emptyDescription="Balances appear once items are received into warehouses."
        />
      )}

      {showForm && (
        <StockMovementFormModal
          onClose={() => setShowForm(false)}
          onSaved={() => {
            setShowForm(false)
            queryClient.invalidateQueries({ queryKey: ['stock-movements'] })
            queryClient.invalidateQueries({ queryKey: ['stock-balances'] })
          }}
        />
      )}
    </div>
  )
}

function StockMovementFormModal({
  onClose,
  onSaved,
}: {
  onClose: () => void
  onSaved: () => void
}) {
  const form = useForm<StockMovementFormData>({
    resolver: zodResolver(movementSchema),
    defaultValues: {
      itemId: '',
      warehouseId: '',
      type: 'IN',
      quantity: 1,
      reference: '',
      notes: '',
    },
  })

  const mutation = useMutation({
    mutationFn: (values: StockMovementFormData) => createStockMovement(values),
    onSuccess: onSaved,
  })

  const onSubmit = form.handleSubmit((v) => mutation.mutate(v))
  const { register, formState: { errors } } = form

  return (
    <Modal open onClose={onClose} title="Record Stock Movement">
      {mutation.isError && (
        <div className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {getApiErrorMessage(mutation.error)}
        </div>
      )}
      <form onSubmit={onSubmit} className="space-y-4">
        <Input
          label="Item ID"
          placeholder="Enter item ID"
          error={errors.itemId?.message}
          {...register('itemId')}
        />
        <Input
          label="Warehouse ID"
          placeholder="Enter warehouse ID"
          error={errors.warehouseId?.message}
          {...register('warehouseId')}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <Select
            label="Type"
            options={[
              { value: 'IN', label: 'Receipt (IN)' },
              { value: 'OUT', label: 'Issue (OUT)' },
              { value: 'ADJUST', label: 'Adjustment' },
              { value: 'RETURN', label: 'Return' },
              { value: 'DISPOSAL', label: 'Disposal' },
              { value: 'RESERVE', label: 'Reserve' },
              { value: 'RELEASE', label: 'Release' },
            ]}
            error={errors.type?.message}
            {...register('type')}
          />
          <Input
            label="Quantity"
            type="number"
            min={1}
            error={errors.quantity?.message}
            {...register('quantity', { valueAsNumber: true })}
          />
        </div>
        <Input label="Reference No." placeholder="e.g. PO-2026-001" {...register('reference')} />
        <Textarea label="Notes" rows={2} {...register('notes')} />
        <div className="flex justify-end gap-2 border-t border-border pt-4">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? <Spinner className="h-4 w-4" /> : null}
            Record Movement
          </Button>
        </div>
      </form>
    </Modal>
  )
}
