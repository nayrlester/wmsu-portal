import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Search, Plus, Pencil, Trash2, Truck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Modal } from '@/components/ui/modal'
import { DataTable } from '@/components/ui/data-table'
import { Badge } from '@/components/ui/badge'
import { Spinner } from '@/components/ui/spinner'
import { getApiErrorMessage } from '@/lib/api-client'
import {
  fetchSuppliers,
  createSupplier,
  updateSupplier,
  deleteSupplier,
} from '../api/suppliers-api'
import type { Supplier, SupplierFormData } from '../types'
import type { Column } from '@/components/ui/data-table'

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  code: z.string().min(1, 'Code is required'),
  contactPerson: z.string(),
  email: z.string().email('Valid email required').or(z.literal('')),
  phone: z.string(),
  address: z.string(),
  tin: z.string(),
})

type ModalState =
  | { mode: 'closed' }
  | { mode: 'create' }
  | { mode: 'edit'; item: Supplier }
  | { mode: 'delete'; item: Supplier }

const columns: Column<Supplier>[] = [
  { key: 'code', header: 'Code', className: 'font-mono text-xs', render: (s) => s.code },
  { key: 'name', header: 'Name', render: (s) => <span className="font-medium">{s.name}</span> },
  { key: 'contactPerson', header: 'Contact', render: (s) => s.contactPerson || '—' },
  { key: 'email', header: 'Email', render: (s) => s.email || '—' },
  { key: 'phone', header: 'Phone', render: (s) => s.phone || '—' },
  { key: 'tin', header: 'TIN', className: 'font-mono text-xs', render: (s) => s.tin || '—' },
  {
    key: 'status',
    header: 'Status',
    render: (s) => (
      <Badge variant={s.status === 'active' ? 'success' : 'default'}>{s.status}</Badge>
    ),
  },
]

export function SuppliersPage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState<ModalState>({ mode: 'closed' })

  const { data, isLoading } = useQuery({
    queryKey: ['suppliers', { search }],
    queryFn: () => fetchSuppliers({ search: search || undefined }),
  })

  const suppliers = data?.data ?? []

  return (
    <div className="space-y-4 animate-fade-up">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1>Suppliers</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">Manage vendor and supplier records</p>
        </div>
        <Button onClick={() => setModal({ mode: 'create' })}>
          <Plus className="h-4 w-4" /> Add Supplier
        </Button>
      </div>

      <div className="relative min-w-[240px] max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search suppliers…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-9 w-full rounded-md border border-border bg-white pl-9 pr-3 text-sm text-ink shadow-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </div>

      <DataTable
        columns={columns}
        data={suppliers}
        keyExtractor={(s) => s.id}
        loading={isLoading}
        emptyIcon={<Truck className="h-12 w-12" />}
        emptyTitle="No suppliers yet"
        emptyDescription="Add your first supplier to track procurement vendors."
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

      {(modal.mode === 'create' || modal.mode === 'edit') && (
        <SupplierFormModal
          mode={modal.mode}
          item={modal.mode === 'edit' ? modal.item : undefined}
          onClose={() => setModal({ mode: 'closed' })}
          onSaved={() => {
            setModal({ mode: 'closed' })
            queryClient.invalidateQueries({ queryKey: ['suppliers'] })
          }}
        />
      )}

      {modal.mode === 'delete' && (
        <DeleteModal
          item={modal.item}
          onClose={() => setModal({ mode: 'closed' })}
          onDeleted={() => {
            setModal({ mode: 'closed' })
            queryClient.invalidateQueries({ queryKey: ['suppliers'] })
          }}
        />
      )}
    </div>
  )
}

function SupplierFormModal({
  mode,
  item,
  onClose,
  onSaved,
}: {
  mode: 'create' | 'edit'
  item?: Supplier
  onClose: () => void
  onSaved: () => void
}) {
  const form = useForm<SupplierFormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: item?.name ?? '',
      code: item?.code ?? '',
      contactPerson: item?.contactPerson ?? '',
      email: item?.email ?? '',
      phone: item?.phone ?? '',
      address: item?.address ?? '',
      tin: item?.tin ?? '',
    },
  })

  const mutation = useMutation({
    mutationFn: (values: SupplierFormData) =>
      mode === 'edit' && item ? updateSupplier(item.id, values) : createSupplier(values),
    onSuccess: onSaved,
  })

  const {
    register,
    formState: { errors },
  } = form

  return (
    <Modal
      open
      onClose={onClose}
      title={mode === 'create' ? 'Add Supplier' : 'Edit Supplier'}
      size="lg"
    >
      {mutation.isError && (
        <div className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {getApiErrorMessage(mutation.error)}
        </div>
      )}
      <form onSubmit={form.handleSubmit((v) => mutation.mutate(v))} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Name" error={errors.name?.message} {...register('name')} />
          <Input label="Code" error={errors.code?.message} {...register('code')} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Contact Person" {...register('contactPerson')} />
          <Input label="TIN" {...register('tin')} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Email" type="email" error={errors.email?.message} {...register('email')} />
          <Input label="Phone" {...register('phone')} />
        </div>
        <Textarea label="Address" rows={2} {...register('address')} />
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

function DeleteModal({
  item,
  onClose,
  onDeleted,
}: {
  item: Supplier
  onClose: () => void
  onDeleted: () => void
}) {
  const mutation = useMutation({
    mutationFn: () => deleteSupplier(item.id),
    onSuccess: onDeleted,
  })

  return (
    <Modal open onClose={onClose} title="Delete Supplier" size="sm">
      <p className="text-sm text-muted-foreground">
        Delete <strong className="text-ink">{item.name}</strong>? This cannot be undone.
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
