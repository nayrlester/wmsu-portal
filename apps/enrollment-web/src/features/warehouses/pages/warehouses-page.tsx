import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Search, Plus, Pencil, Trash2, Warehouse, Boxes } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { DataTable } from '@/components/ui/data-table'
import { Badge } from '@/components/ui/badge'
import { Spinner } from '@/components/ui/spinner'
import { getApiErrorMessage } from '@/lib/api-client'
import { formatNumber } from '@/lib/utils'
import {
  fetchWarehouses,
  createWarehouse,
  updateWarehouse,
  deleteWarehouse,
  fetchWarehouseBins,
  createWarehouseBin,
  deleteWarehouseBin,
} from '../api/warehouses-api'
import type { WarehouseRecord, WarehouseFormData, WarehouseBin, BinFormData } from '../types'
import type { Column } from '@/components/ui/data-table'

const warehouseSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  code: z.string().min(1, 'Code is required'),
  address: z.string(),
  city: z.string(),
  province: z.string(),
})

const binSchema = z.object({
  code: z.string().min(1, 'Code is required'),
  name: z.string().min(1, 'Name is required'),
  aisle: z.string(),
  shelf: z.string(),
  capacity: z.number().min(0),
})

type ModalState =
  | { mode: 'closed' }
  | { mode: 'create' }
  | { mode: 'edit'; item: WarehouseRecord }
  | { mode: 'delete'; item: WarehouseRecord }
  | { mode: 'bins'; item: WarehouseRecord }

const columns: Column<WarehouseRecord>[] = [
  { key: 'code', header: 'Code', className: 'font-mono text-xs', render: (w) => w.code },
  { key: 'name', header: 'Name', render: (w) => <span className="font-medium">{w.name}</span> },
  { key: 'city', header: 'City' },
  { key: 'province', header: 'Province' },
  {
    key: 'bins',
    header: 'Bins',
    className: 'text-right',
    render: (w) => formatNumber(w.bins?.length ?? 0),
  },
  {
    key: 'itemCount',
    header: 'Items',
    className: 'text-right',
    render: (w) => formatNumber(w.itemCount),
  },
  {
    key: 'status',
    header: 'Status',
    render: (w) => (
      <Badge variant={w.status === 'active' ? 'success' : 'default'}>{w.status}</Badge>
    ),
  },
]

export function WarehousesPage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState<ModalState>({ mode: 'closed' })

  const { data, isLoading } = useQuery({
    queryKey: ['warehouses', { search }],
    queryFn: () => fetchWarehouses({ search: search || undefined }),
  })

  const warehouses = data?.data ?? []

  return (
    <div className="space-y-4 animate-fade-up">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1>Warehouses</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Manage storage locations, facilities, and bins
          </p>
        </div>
        <Button onClick={() => setModal({ mode: 'create' })}>
          <Plus className="h-4 w-4" /> Add Warehouse
        </Button>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative min-w-[240px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search warehouses…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 w-full rounded-md border border-border bg-white pl-9 pr-3 text-sm text-ink shadow-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
      </div>

      <DataTable
        columns={columns}
        data={warehouses}
        keyExtractor={(w) => w.id}
        loading={isLoading}
        emptyIcon={<Warehouse className="h-12 w-12" />}
        emptyTitle="No warehouses yet"
        emptyDescription="Add your first warehouse to begin tracking storage locations."
        actions={(item) => (
          <>
            <Button
              variant="ghost"
              size="icon"
              title="Manage bins"
              onClick={() => setModal({ mode: 'bins', item })}
            >
              <Boxes className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setModal({ mode: 'edit', item })}>
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setModal({ mode: 'delete', item })}>
              <Trash2 className="h-3.5 w-3.5 text-red-500" />
            </Button>
          </>
        )}
      />

      {(modal.mode === 'create' || modal.mode === 'edit') && (
        <WarehouseFormModal
          mode={modal.mode}
          item={modal.mode === 'edit' ? modal.item : undefined}
          onClose={() => setModal({ mode: 'closed' })}
          onSaved={() => {
            setModal({ mode: 'closed' })
            queryClient.invalidateQueries({ queryKey: ['warehouses'] })
          }}
        />
      )}

      {modal.mode === 'delete' && (
        <DeleteWarehouseModal
          item={modal.item}
          onClose={() => setModal({ mode: 'closed' })}
          onDeleted={() => {
            setModal({ mode: 'closed' })
            queryClient.invalidateQueries({ queryKey: ['warehouses'] })
          }}
        />
      )}

      {modal.mode === 'bins' && (
        <BinsModal warehouse={modal.item} onClose={() => setModal({ mode: 'closed' })} />
      )}
    </div>
  )
}

function WarehouseFormModal({
  mode,
  item,
  onClose,
  onSaved,
}: {
  mode: 'create' | 'edit'
  item?: WarehouseRecord
  onClose: () => void
  onSaved: () => void
}) {
  const form = useForm<WarehouseFormData>({
    resolver: zodResolver(warehouseSchema),
    defaultValues: {
      name: item?.name ?? '',
      code: item?.code ?? '',
      address: item?.address ?? '',
      city: item?.city ?? '',
      province: item?.province ?? '',
    },
  })

  const mutation = useMutation({
    mutationFn: (values: WarehouseFormData) =>
      mode === 'edit' && item ? updateWarehouse(item.id, values) : createWarehouse(values),
    onSuccess: onSaved,
  })

  const onSubmit = form.handleSubmit((v) => mutation.mutate(v))
  const {
    register,
    formState: { errors },
  } = form

  return (
    <Modal open onClose={onClose} title={mode === 'create' ? 'Add Warehouse' : 'Edit Warehouse'}>
      {mutation.isError && (
        <div className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {getApiErrorMessage(mutation.error)}
        </div>
      )}
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Name" error={errors.name?.message} {...register('name')} />
          <Input
            label="Code"
            placeholder="e.g. WH-001"
            error={errors.code?.message}
            {...register('code')}
          />
        </div>
        <Input label="Address" {...register('address')} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="City" {...register('city')} />
          <Input label="Province" {...register('province')} />
        </div>
        <div className="flex justify-end gap-2 border-t border-border pt-4">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? <Spinner className="h-4 w-4" /> : null}
            {mode === 'create' ? 'Create' : 'Save Changes'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

function DeleteWarehouseModal({
  item,
  onClose,
  onDeleted,
}: {
  item: WarehouseRecord
  onClose: () => void
  onDeleted: () => void
}) {
  const mutation = useMutation({
    mutationFn: () => deleteWarehouse(item.id),
    onSuccess: onDeleted,
  })

  return (
    <Modal open onClose={onClose} title="Delete Warehouse" size="sm">
      <p className="text-sm text-muted-foreground">
        Are you sure you want to delete <strong className="text-ink">{item.name}</strong>? All
        associated stock records may be affected.
      </p>
      {mutation.isError && (
        <div className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {getApiErrorMessage(mutation.error)}
        </div>
      )}
      <div className="mt-5 flex justify-end gap-2">
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button
          variant="destructive"
          disabled={mutation.isPending}
          onClick={() => mutation.mutate()}
        >
          {mutation.isPending ? <Spinner className="h-4 w-4" /> : null}
          Delete
        </Button>
      </div>
    </Modal>
  )
}

function BinsModal({ warehouse, onClose }: { warehouse: WarehouseRecord; onClose: () => void }) {
  const queryClient = useQueryClient()
  const [showAdd, setShowAdd] = useState(false)

  const { data: bins = [], isLoading } = useQuery({
    queryKey: ['warehouse-bins', warehouse.id],
    queryFn: () => fetchWarehouseBins(warehouse.id),
  })

  const createMutation = useMutation({
    mutationFn: (values: BinFormData) => createWarehouseBin(warehouse.id, values),
    onSuccess: () => {
      setShowAdd(false)
      queryClient.invalidateQueries({ queryKey: ['warehouse-bins', warehouse.id] })
      queryClient.invalidateQueries({ queryKey: ['warehouses'] })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (binId: string) => deleteWarehouseBin(warehouse.id, binId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['warehouse-bins', warehouse.id] })
      queryClient.invalidateQueries({ queryKey: ['warehouses'] })
    },
  })

  const form = useForm<BinFormData>({
    resolver: zodResolver(binSchema),
    defaultValues: { code: '', name: '', aisle: '', shelf: '', capacity: 0 },
  })

  return (
    <Modal open onClose={onClose} title={`Bins — ${warehouse.name}`} size="lg">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Manage storage bins for this warehouse.</p>
        <Button size="sm" onClick={() => setShowAdd(true)}>
          <Plus className="h-3.5 w-3.5" /> Add Bin
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <Spinner />
        </div>
      ) : bins.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">No bins yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-[var(--color-primary-soft)]/50">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-semibold">Code</th>
                <th className="px-3 py-2 text-left text-xs font-semibold">Name</th>
                <th className="px-3 py-2 text-left text-xs font-semibold">Aisle</th>
                <th className="px-3 py-2 text-left text-xs font-semibold">Shelf</th>
                <th className="px-3 py-2 text-right text-xs font-semibold">Capacity</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {bins.map((bin: WarehouseBin) => (
                <tr key={bin.id}>
                  <td className="px-3 py-2 font-mono text-xs">{bin.code}</td>
                  <td className="px-3 py-2">{bin.name}</td>
                  <td className="px-3 py-2">{bin.aisle || '—'}</td>
                  <td className="px-3 py-2">{bin.shelf || '—'}</td>
                  <td className="px-3 py-2 text-right">{formatNumber(bin.capacity)}</td>
                  <td className="px-3 py-2 text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      disabled={deleteMutation.isPending}
                      onClick={() => deleteMutation.mutate(bin.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5 text-red-500" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showAdd && (
        <form
          className="mt-4 space-y-3 border-t border-border pt-4"
          onSubmit={form.handleSubmit((v) => createMutation.mutate(v))}
        >
          {createMutation.isError && (
            <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
              {getApiErrorMessage(createMutation.error)}
            </div>
          )}
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              label="Code"
              error={form.formState.errors.code?.message}
              {...form.register('code')}
            />
            <Input
              label="Name"
              error={form.formState.errors.name?.message}
              {...form.register('name')}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <Input label="Aisle" {...form.register('aisle')} />
            <Input label="Shelf" {...form.register('shelf')} />
            <Input
              label="Capacity"
              type="number"
              min={0}
              {...form.register('capacity', { valueAsNumber: true })}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setShowAdd(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? <Spinner className="h-4 w-4" /> : null}
              Save Bin
            </Button>
          </div>
        </form>
      )}
    </Modal>
  )
}
