import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Search,
  Plus,
  Pencil,
  Trash2,
  HardDrive,
  UserPlus,
  Undo2,
  Wrench,
  QrCode,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { DatePicker } from '@/components/ui/date-picker'
import { Modal } from '@/components/ui/modal'
import { DataTable } from '@/components/ui/data-table'
import { Badge } from '@/components/ui/badge'
import { Spinner } from '@/components/ui/spinner'
import { getApiErrorMessage } from '@/lib/api-client'
import { formatCurrency } from '@/lib/utils'
import {
  fetchAssets,
  createAsset,
  updateAsset,
  deleteAsset,
  assignAsset,
  returnAsset,
  scheduleAssetMaintenance,
  generateAssetQr,
  ASSET_TYPE_OPTIONS,
  ASSET_STATUS_OPTIONS,
  assetTypeLabel,
} from '../api/assets-api'
import type { Asset, AssetFormData } from '../types'
import type { Column } from '@/components/ui/data-table'

const assetSchema = z.object({
  tagNumber: z.string().min(1, 'Property tag is required'),
  name: z.string().min(1, 'Name is required'),
  description: z.string(),
  category: z
    .string()
    .min(1, 'Category is required')
    .refine(
      (v) => ['equipment', 'furniture', 'vehicle', 'it_hardware', 'building', 'other'].includes(v),
      'Select a valid category'
    ),
  serialNumber: z.string(),
  brand: z.string(),
  model: z.string(),
  manufacturer: z.string(),
  fundSource: z.string(),
  acquisitionDate: z.string().min(1, 'Acquisition date is required'),
  acquisitionCost: z.number().min(0),
  warrantyExpiry: z.string(),
  location: z.string(),
  assignedTo: z.string(),
  status: z.string().min(1, 'Status is required'),
})

type ModalState =
  | { mode: 'closed' }
  | { mode: 'create' }
  | { mode: 'edit'; item: Asset }
  | { mode: 'delete'; item: Asset }
  | { mode: 'assign'; item: Asset }
  | { mode: 'return'; item: Asset }
  | { mode: 'maintenance'; item: Asset }
  | { mode: 'qr'; item: Asset; qrUrl: string; qrData: string }

const categoryOptions = [...ASSET_TYPE_OPTIONS]
const statusOptions = [...ASSET_STATUS_OPTIONS]

const fundSourceOptions = [
  { value: 'GAA', label: 'GAA' },
  { value: 'STF', label: 'Special Trust Fund' },
  { value: 'IGP', label: 'Income Generating Project' },
  { value: 'Donation', label: 'Donation' },
  { value: 'Other', label: 'Other' },
]

function statusBadge(status: string) {
  const map: Record<string, 'success' | 'danger' | 'warning' | 'default'> = {
    available: 'success',
    assigned: 'default',
    in_maintenance: 'warning',
    retired: 'danger',
    disposed: 'default',
  }
  const label = statusOptions.find((o) => o.value === status)?.label ?? status.replace(/_/g, ' ')
  return <Badge variant={map[status] ?? 'default'}>{label}</Badge>
}

const columns: Column<Asset>[] = [
  {
    key: 'tagNumber',
    header: 'Tag No.',
    className: 'font-mono text-xs',
    render: (a) => a.tagNumber,
  },
  { key: 'name', header: 'Name', render: (a) => <span className="font-medium">{a.name}</span> },
  {
    key: 'brand',
    header: 'Brand / Model',
    render: (a) => [a.brand, a.model].filter(Boolean).join(' ') || '—',
  },
  {
    key: 'category',
    header: 'Category',
    render: (a) => <Badge>{assetTypeLabel(a.category)}</Badge>,
  },
  { key: 'fundSource', header: 'Fund', render: (a) => a.fundSource || '—' },
  { key: 'location', header: 'Location' },
  {
    key: 'acquisitionCost',
    header: 'Cost',
    className: 'text-right',
    render: (a) => formatCurrency(a.acquisitionCost),
  },
  { key: 'assignedTo', header: 'Assigned To', render: (a) => a.assignedTo || '—' },
  { key: 'status', header: 'Status', render: (a) => statusBadge(a.status) },
]

export function AssetsPage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [modal, setModal] = useState<ModalState>({ mode: 'closed' })

  const { data, isLoading } = useQuery({
    queryKey: ['assets', { search, status: statusFilter }],
    queryFn: () => fetchAssets({ search: search || undefined, status: statusFilter || undefined }),
  })

  const assets = data?.data ?? []

  const qrMutation = useMutation({
    mutationFn: (asset: Asset) => generateAssetQr(asset.id).then((qr) => ({ asset, ...qr })),
    onSuccess: ({ asset, qrUrl, qrData }) => setModal({ mode: 'qr', item: asset, qrUrl, qrData }),
  })

  return (
    <div className="space-y-4 animate-fade-up">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1>Assets</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Track property, plant, and equipment
          </p>
        </div>
        <Button onClick={() => setModal({ mode: 'create' })}>
          <Plus className="h-4 w-4" /> Add Asset
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[240px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search assets…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 w-full rounded-md border border-border bg-white pl-9 pr-3 text-sm text-ink shadow-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-9 rounded-md border border-border bg-white px-3 text-sm text-ink shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        >
          <option value="">All Statuses</option>
          {statusOptions.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      <DataTable
        columns={columns}
        data={assets}
        keyExtractor={(a) => a.id}
        loading={isLoading}
        emptyIcon={<HardDrive className="h-12 w-12" />}
        emptyTitle="No assets registered"
        emptyDescription="Register your first asset to begin tracking property and equipment."
        actions={(item) => (
          <>
            <Button
              variant="ghost"
              size="icon"
              title="Assign"
              onClick={() => setModal({ mode: 'assign', item })}
            >
              <UserPlus className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              title="Return"
              onClick={() => setModal({ mode: 'return', item })}
            >
              <Undo2 className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              title="Maintenance"
              onClick={() => setModal({ mode: 'maintenance', item })}
            >
              <Wrench className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              title="QR Code"
              disabled={qrMutation.isPending}
              onClick={() => qrMutation.mutate(item)}
            >
              <QrCode className="h-3.5 w-3.5" />
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
        <AssetFormModal
          mode={modal.mode}
          item={modal.mode === 'edit' ? modal.item : undefined}
          onClose={() => setModal({ mode: 'closed' })}
          onSaved={() => {
            setModal({ mode: 'closed' })
            queryClient.invalidateQueries({ queryKey: ['assets'] })
          }}
        />
      )}

      {modal.mode === 'delete' && (
        <DeleteAssetModal
          item={modal.item}
          onClose={() => setModal({ mode: 'closed' })}
          onDeleted={() => {
            setModal({ mode: 'closed' })
            queryClient.invalidateQueries({ queryKey: ['assets'] })
          }}
        />
      )}

      {modal.mode === 'assign' && (
        <AssignModal
          item={modal.item}
          onClose={() => setModal({ mode: 'closed' })}
          onDone={() => {
            setModal({ mode: 'closed' })
            queryClient.invalidateQueries({ queryKey: ['assets'] })
          }}
        />
      )}

      {modal.mode === 'return' && (
        <ReturnModal
          item={modal.item}
          onClose={() => setModal({ mode: 'closed' })}
          onDone={() => {
            setModal({ mode: 'closed' })
            queryClient.invalidateQueries({ queryKey: ['assets'] })
          }}
        />
      )}

      {modal.mode === 'maintenance' && (
        <MaintenanceModal
          item={modal.item}
          onClose={() => setModal({ mode: 'closed' })}
          onDone={() => {
            setModal({ mode: 'closed' })
            queryClient.invalidateQueries({ queryKey: ['assets'] })
          }}
        />
      )}

      {modal.mode === 'qr' && (
        <Modal
          open
          onClose={() => setModal({ mode: 'closed' })}
          title={`QR — ${modal.item.tagNumber}`}
          size="sm"
        >
          <div className="space-y-3 text-center">
            {modal.qrUrl ? (
              <img src={modal.qrUrl} alt="Asset QR" className="mx-auto h-48 w-48 object-contain" />
            ) : (
              <p className="break-all rounded-xl bg-[var(--color-primary-soft)] p-4 font-mono text-xs">
                {modal.qrData || modal.item.tagNumber}
              </p>
            )}
            <p className="text-sm text-muted-foreground">{modal.item.name}</p>
          </div>
        </Modal>
      )}
    </div>
  )
}

function AssetFormModal({
  mode,
  item,
  onClose,
  onSaved,
}: {
  mode: 'create' | 'edit'
  item?: Asset
  onClose: () => void
  onSaved: () => void
}) {
  const form = useForm<AssetFormData>({
    resolver: zodResolver(assetSchema),
    defaultValues: {
      tagNumber: item?.tagNumber ?? '',
      name: item?.name ?? '',
      description: item?.description ?? '',
      category: item?.category ?? 'equipment',
      serialNumber: item?.serialNumber ?? '',
      brand: item?.brand ?? '',
      model: item?.model ?? '',
      manufacturer: item?.manufacturer ?? '',
      fundSource: item?.fundSource ?? '',
      acquisitionDate: item?.acquisitionDate?.slice(0, 10) ?? '',
      acquisitionCost: item?.acquisitionCost ?? 0,
      warrantyExpiry: item?.warrantyExpiry?.slice(0, 10) ?? '',
      location: item?.location ?? '',
      assignedTo: item?.assignedTo ?? '',
      status: item?.status ?? 'available',
    },
  })

  const mutation = useMutation({
    mutationFn: (values: AssetFormData) =>
      mode === 'edit' && item ? updateAsset(item.id, values) : createAsset(values),
    onSuccess: onSaved,
  })

  const onSubmit = form.handleSubmit((v) => mutation.mutate(v))
  const {
    register,
    control,
    formState: { errors },
  } = form

  return (
    <Modal
      open
      onClose={onClose}
      title={mode === 'create' ? 'Register Asset' : 'Edit Asset'}
      size="lg"
    >
      {mutation.isError && (
        <div className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {getApiErrorMessage(mutation.error)}
        </div>
      )}
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Property Tag No."
            error={errors.tagNumber?.message}
            {...register('tagNumber')}
          />
          <Input label="Name" error={errors.name?.message} {...register('name')} />
        </div>
        <Textarea label="Description" rows={2} {...register('description')} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Select
            label="Category"
            placeholder="Select…"
            options={categoryOptions}
            error={errors.category?.message}
            {...register('category')}
          />
          <Input label="Serial Number" {...register('serialNumber')} />
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <Input label="Brand" {...register('brand')} />
          <Input label="Model" {...register('model')} />
          <Input label="Manufacturer" {...register('manufacturer')} />
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <Controller
            name="acquisitionDate"
            control={control}
            render={({ field }) => (
              <DatePicker
                label="Acquisition Date"
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                name={field.name}
                error={errors.acquisitionDate?.message}
                placeholder="Select acquisition date"
              />
            )}
          />
          <Input
            label="Acquisition Cost (₱)"
            type="number"
            min={0}
            step="0.01"
            {...register('acquisitionCost', { valueAsNumber: true })}
          />
          <Controller
            name="warrantyExpiry"
            control={control}
            render={({ field }) => (
              <DatePicker
                label="Warranty Expiry"
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                name={field.name}
                placeholder="Optional"
              />
            )}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Select
            label="Fund Source"
            placeholder="Select…"
            options={fundSourceOptions}
            {...register('fundSource')}
          />
          <Select
            label="Status"
            options={statusOptions}
            error={errors.status?.message}
            {...register('status')}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Location" {...register('location')} />
          <Input label="Assigned To" {...register('assignedTo')} />
        </div>
        <div className="flex justify-end gap-2 border-t border-border pt-4">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? <Spinner className="h-4 w-4" /> : null}
            {mode === 'create' ? 'Register' : 'Save Changes'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

function DeleteAssetModal({
  item,
  onClose,
  onDeleted,
}: {
  item: Asset
  onClose: () => void
  onDeleted: () => void
}) {
  const mutation = useMutation({
    mutationFn: () => deleteAsset(item.id),
    onSuccess: onDeleted,
  })

  return (
    <Modal open onClose={onClose} title="Delete Asset" size="sm">
      <p className="text-sm text-muted-foreground">
        Are you sure you want to delete asset <strong className="text-ink">{item.tagNumber}</strong>{' '}
        — <strong className="text-ink">{item.name}</strong>? This cannot be undone.
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

function AssignModal({
  item,
  onClose,
  onDone,
}: {
  item: Asset
  onClose: () => void
  onDone: () => void
}) {
  const [assignedTo, setAssignedTo] = useState('')
  const [location, setLocation] = useState(item.location)
  const [notes, setNotes] = useState('')
  const mutation = useMutation({
    mutationFn: () => assignAsset(item.id, { assignedTo, location, notes }),
    onSuccess: onDone,
  })

  return (
    <Modal open onClose={onClose} title={`Assign — ${item.tagNumber}`} size="sm">
      {mutation.isError && (
        <div className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {getApiErrorMessage(mutation.error)}
        </div>
      )}
      <div className="space-y-4">
        <Input
          label="Assign To"
          value={assignedTo}
          onChange={(e) => setAssignedTo(e.target.value)}
          placeholder="Employee / office name"
        />
        <Input label="Location" value={location} onChange={(e) => setLocation(e.target.value)} />
        <Textarea label="Notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
        <div className="flex justify-end gap-2 border-t border-border pt-4">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button disabled={!assignedTo || mutation.isPending} onClick={() => mutation.mutate()}>
            {mutation.isPending ? <Spinner className="h-4 w-4" /> : null}
            Assign
          </Button>
        </div>
      </div>
    </Modal>
  )
}

function ReturnModal({
  item,
  onClose,
  onDone,
}: {
  item: Asset
  onClose: () => void
  onDone: () => void
}) {
  const [location, setLocation] = useState('')
  const [notes, setNotes] = useState('')
  const mutation = useMutation({
    mutationFn: () => returnAsset(item.id, { location, notes }),
    onSuccess: onDone,
  })

  return (
    <Modal open onClose={onClose} title={`Return — ${item.tagNumber}`} size="sm">
      <p className="mb-4 text-sm text-muted-foreground">
        Currently assigned to <strong className="text-ink">{item.assignedTo || '—'}</strong>
      </p>
      {mutation.isError && (
        <div className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {getApiErrorMessage(mutation.error)}
        </div>
      )}
      <div className="space-y-4">
        <Input
          label="Return Location"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
        />
        <Textarea label="Notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
        <div className="flex justify-end gap-2 border-t border-border pt-4">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button disabled={mutation.isPending} onClick={() => mutation.mutate()}>
            {mutation.isPending ? <Spinner className="h-4 w-4" /> : null}
            Return Asset
          </Button>
        </div>
      </div>
    </Modal>
  )
}

function MaintenanceModal({
  item,
  onClose,
  onDone,
}: {
  item: Asset
  onClose: () => void
  onDone: () => void
}) {
  const [description, setDescription] = useState('')
  const [scheduledDate, setScheduledDate] = useState('')
  const [notes, setNotes] = useState('')
  const mutation = useMutation({
    mutationFn: () => scheduleAssetMaintenance(item.id, { description, scheduledDate, notes }),
    onSuccess: onDone,
  })

  return (
    <Modal open onClose={onClose} title={`Maintenance — ${item.tagNumber}`} size="sm">
      {mutation.isError && (
        <div className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {getApiErrorMessage(mutation.error)}
        </div>
      )}
      <div className="space-y-4">
        <Textarea
          label="Description"
          rows={2}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <DatePicker
          label="Scheduled Date"
          value={scheduledDate}
          onChange={setScheduledDate}
          placeholder="Select scheduled date"
        />
        <Textarea label="Notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
        <div className="flex justify-end gap-2 border-t border-border pt-4">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button disabled={!description || mutation.isPending} onClick={() => mutation.mutate()}>
            {mutation.isPending ? <Spinner className="h-4 w-4" /> : null}
            Schedule
          </Button>
        </div>
      </div>
    </Modal>
  )
}
