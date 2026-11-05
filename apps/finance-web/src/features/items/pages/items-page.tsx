import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Search, Plus, Pencil, Trash2, Package, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Modal } from '@/components/ui/modal'
import { DataTable } from '@/components/ui/data-table'
import { Badge } from '@/components/ui/badge'
import { Spinner } from '@/components/ui/spinner'
import { getApiErrorMessage } from '@/lib/api-client'
import { formatCurrency, formatNumber } from '@/lib/utils'
import { fetchItems, createItem, updateItem, deleteItem, importItemsCsv } from '../api/items-api'
import type { Item, ItemFormData } from '../types'
import type { Column } from '@/components/ui/data-table'

const itemSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  sku: z.string().min(1, 'SKU is required'),
  description: z.string(),
  category: z.string().min(1, 'Category is required'),
  unit: z.string().min(1, 'Unit is required'),
  reorderLevel: z.number().min(0),
  unitCost: z.number().min(0),
  brand: z.string(),
  model: z.string(),
  manufacturer: z.string(),
  fundSource: z.string(),
  barcode: z.string(),
})

type ModalState =
  | { mode: 'closed' }
  | { mode: 'create' }
  | { mode: 'edit'; item: Item }
  | { mode: 'delete'; item: Item }
  | { mode: 'import' }

const categoryOptions = [
  { value: 'office-supplies', label: 'Office Supplies' },
  { value: 'electronics', label: 'Electronics' },
  { value: 'furniture', label: 'Furniture' },
  { value: 'lab-equipment', label: 'Lab Equipment' },
  { value: 'cleaning', label: 'Cleaning Materials' },
  { value: 'medical', label: 'Medical Supplies' },
  { value: 'other', label: 'Other' },
]

const unitOptions = [
  { value: 'pcs', label: 'Pieces' },
  { value: 'box', label: 'Box' },
  { value: 'ream', label: 'Ream' },
  { value: 'kg', label: 'Kilogram' },
  { value: 'L', label: 'Liter' },
  { value: 'set', label: 'Set' },
  { value: 'roll', label: 'Roll' },
  { value: 'pack', label: 'Pack' },
]

const fundSourceOptions = [
  { value: 'GAA', label: 'GAA' },
  { value: 'STF', label: 'Special Trust Fund' },
  { value: 'IGP', label: 'Income Generating Project' },
  { value: 'Donation', label: 'Donation' },
  { value: 'Other', label: 'Other' },
]

const columns: Column<Item>[] = [
  { key: 'sku', header: 'SKU', className: 'font-mono text-xs', render: (i) => i.sku },
  { key: 'name', header: 'Name', render: (i) => <span className="font-medium">{i.name}</span> },
  { key: 'brand', header: 'Brand / Model', render: (i) => [i.brand, i.model].filter(Boolean).join(' ') || '—' },
  { key: 'barcode', header: 'Barcode', className: 'font-mono text-xs', render: (i) => i.barcode || '—' },
  { key: 'category', header: 'Category', render: (i) => <Badge>{i.category}</Badge> },
  { key: 'fundSource', header: 'Fund', render: (i) => i.fundSource || '—' },
  { key: 'unit', header: 'Unit' },
  {
    key: 'currentStock',
    header: 'Stock',
    className: 'text-right',
    render: (i) => (
      <span className={i.currentStock <= i.reorderLevel ? 'font-semibold text-amber-600' : ''}>
        {formatNumber(i.currentStock)}
      </span>
    ),
  },
  {
    key: 'unitCost',
    header: 'Unit Cost',
    className: 'text-right',
    render: (i) => formatCurrency(i.unitCost),
  },
  {
    key: 'status',
    header: 'Status',
    render: (i) => (
      <Badge variant={i.status === 'active' ? 'success' : 'default'}>{i.status}</Badge>
    ),
  },
]

export function ItemsPage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [modal, setModal] = useState<ModalState>({ mode: 'closed' })

  const { data, isLoading } = useQuery({
    queryKey: ['items', { search, category: categoryFilter }],
    queryFn: () => fetchItems({ search: search || undefined, category: categoryFilter || undefined }),
  })

  const items = data?.data ?? []

  return (
    <div className="space-y-4 animate-fade-up">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1>Items</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">Manage inventory items and supplies</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => setModal({ mode: 'import' })}>
            <Upload className="h-4 w-4" /> Import CSV
          </Button>
          <Button onClick={() => setModal({ mode: 'create' })}>
            <Plus className="h-4 w-4" /> Add Item
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[240px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search items…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 w-full rounded-md border border-border bg-white pl-9 pr-3 text-sm text-ink shadow-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="h-9 rounded-md border border-border bg-white px-3 text-sm text-ink shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        >
          <option value="">All Categories</option>
          {categoryOptions.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      <DataTable
        columns={columns}
        data={items}
        keyExtractor={(i) => i.id}
        loading={isLoading}
        label="Inventory items"
        emptyIcon={<Package className="h-12 w-12" />}
        emptyTitle="No items yet"
        emptyDescription="Create your first inventory item to get started."
        actions={(item) => (
          <>
            <Button variant="ghost" size="icon" onClick={() => setModal({ mode: 'edit', item })}>
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setModal({ mode: 'delete', item })}>
              <Trash2 className="h-3.5 w-3.5 text-red-500" />
            </Button>
          </>
        )}
      />

      {modal.mode === 'import' && (
        <ImportItemsModal
          onClose={() => setModal({ mode: 'closed' })}
          onImported={() => {
            setModal({ mode: 'closed' })
            queryClient.invalidateQueries({ queryKey: ['items'] })
          }}
        />
      )}

      {(modal.mode === 'create' || modal.mode === 'edit') && (
        <ItemFormModal
          mode={modal.mode}
          item={modal.mode === 'edit' ? modal.item : undefined}
          onClose={() => setModal({ mode: 'closed' })}
          onSaved={() => {
            setModal({ mode: 'closed' })
            queryClient.invalidateQueries({ queryKey: ['items'] })
          }}
        />
      )}

      {modal.mode === 'delete' && (
        <DeleteItemModal
          item={modal.item}
          onClose={() => setModal({ mode: 'closed' })}
          onDeleted={() => {
            setModal({ mode: 'closed' })
            queryClient.invalidateQueries({ queryKey: ['items'] })
          }}
        />
      )}
    </div>
  )
}

function ItemFormModal({
  mode,
  item,
  onClose,
  onSaved,
}: {
  mode: 'create' | 'edit'
  item?: Item
  onClose: () => void
  onSaved: () => void
}) {
  const form = useForm<ItemFormData>({
    resolver: zodResolver(itemSchema),
    defaultValues: {
      name: item?.name ?? '',
      sku: item?.sku ?? '',
      description: item?.description ?? '',
      category: item?.category ?? '',
      unit: item?.unit ?? '',
      reorderLevel: item?.reorderLevel ?? 0,
      unitCost: item?.unitCost ?? 0,
      brand: item?.brand ?? '',
      model: item?.model ?? '',
      manufacturer: item?.manufacturer ?? '',
      fundSource: item?.fundSource ?? '',
      barcode: item?.barcode ?? '',
    },
  })

  const mutation = useMutation({
    mutationFn: (values: ItemFormData) =>
      mode === 'edit' && item ? updateItem(item.id, values) : createItem(values),
    onSuccess: onSaved,
  })

  const onSubmit = form.handleSubmit((values) => mutation.mutate(values))
  const { register, formState: { errors } } = form

  return (
    <Modal open onClose={onClose} title={mode === 'create' ? 'Add Item' : 'Edit Item'} size="lg">
      {mutation.isError && (
        <div className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {getApiErrorMessage(mutation.error)}
        </div>
      )}
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Name" error={errors.name?.message} {...register('name')} />
          <Input label="SKU" error={errors.sku?.message} {...register('sku')} />
        </div>
        <Textarea label="Description" rows={2} {...register('description')} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Select label="Category" placeholder="Select…" options={categoryOptions} error={errors.category?.message} {...register('category')} />
          <Select label="Unit" placeholder="Select…" options={unitOptions} error={errors.unit?.message} {...register('unit')} />
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <Input label="Brand" {...register('brand')} />
          <Input label="Model" {...register('model')} />
          <Input label="Manufacturer" {...register('manufacturer')} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Select label="Fund Source" placeholder="Select…" options={fundSourceOptions} {...register('fundSource')} />
          <Input label="Barcode" {...register('barcode')} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Reorder Level" type="number" min={0} error={errors.reorderLevel?.message} {...register('reorderLevel', { valueAsNumber: true })} />
          <Input label="Unit Cost (₱)" type="number" min={0} step="0.01" error={errors.unitCost?.message} {...register('unitCost', { valueAsNumber: true })} />
        </div>
        <div className="flex justify-end gap-2 border-t border-border pt-4">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? <Spinner className="h-4 w-4" /> : null}
            {mode === 'create' ? 'Create' : 'Save Changes'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

function DeleteItemModal({
  item,
  onClose,
  onDeleted,
}: {
  item: Item
  onClose: () => void
  onDeleted: () => void
}) {
  const mutation = useMutation({
    mutationFn: () => deleteItem(item.id),
    onSuccess: onDeleted,
  })

  return (
    <Modal open onClose={onClose} title="Delete Item" size="sm">
      <p className="text-sm text-muted-foreground">
        Are you sure you want to delete <strong className="text-ink">{item.name}</strong>? This action cannot be undone.
      </p>
      {mutation.isError && (
        <div className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {getApiErrorMessage(mutation.error)}
        </div>
      )}
      <div className="mt-5 flex justify-end gap-2">
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button variant="destructive" disabled={mutation.isPending} onClick={() => mutation.mutate()}>
          {mutation.isPending ? <Spinner className="h-4 w-4" /> : null}
          Delete
        </Button>
      </div>
    </Modal>
  )
}

function ImportItemsModal({ onClose, onImported }: { onClose: () => void; onImported: () => void }) {
  const [csv, setCsv] = useState(
    'sku,name,uom,barcode,fundSource,brand,model,manufacturer,minStock,reorderPoint,description\n'
  )
  const [result, setResult] = useState<{ created: number; updated: number; errors: string[] } | null>(
    null
  )

  const mutation = useMutation({
    mutationFn: () => importItemsCsv(csv),
    onSuccess: (data) => {
      setResult(data)
      if (!data.errors.length) onImported()
    },
  })

  return (
    <Modal open onClose={onClose} title="Import Items (CSV)" size="lg">
      <p className="mb-3 text-sm text-muted-foreground">
        Upload or paste CSV with headers: <code className="text-xs">sku,name,uom,...</code>. Existing SKUs are
        updated.
      </p>
      <textarea
        className="h-48 w-full rounded-2xl border border-transparent bg-[var(--color-primary-soft)] px-4 py-3 font-mono text-xs text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/35"
        value={csv}
        onChange={(e) => setCsv(e.target.value)}
        aria-label="CSV content"
      />
      <div className="mt-3">
        <input
          type="file"
          accept=".csv,text/csv"
          aria-label="Choose CSV file"
          onChange={async (e) => {
            const file = e.target.files?.[0]
            if (!file) return
            setCsv(await file.text())
          }}
        />
      </div>
      {mutation.isError && (
        <div className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {getApiErrorMessage(mutation.error)}
        </div>
      )}
      {result && (
        <div className="mt-3 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800" role="status" aria-live="polite">
          Created {result.created}, updated {result.updated}
          {result.errors.length > 0 && (
            <ul className="mt-2 list-disc pl-5 text-rose-700">
              {result.errors.slice(0, 8).map((err) => (
                <li key={err}>{err}</li>
              ))}
            </ul>
          )}
        </div>
      )}
      <div className="mt-5 flex justify-end gap-2">
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button disabled={mutation.isPending || csv.trim().length < 8} onClick={() => mutation.mutate()}>
          {mutation.isPending ? <Spinner className="h-4 w-4" /> : null}
          Import
        </Button>
      </div>
    </Modal>
  )
}
