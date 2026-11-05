import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, ClipboardCheck, Scale, Lock, Smartphone } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DatePicker } from '@/components/ui/date-picker'
import { Modal } from '@/components/ui/modal'
import { DataTable } from '@/components/ui/data-table'
import { Badge } from '@/components/ui/badge'
import { Spinner } from '@/components/ui/spinner'
import { getApiErrorMessage } from '@/lib/api-client'
import { formatNumber } from '@/lib/utils'
import { fetchCounts, createCount, reconcileCount, closeCount } from '../api/counts-api'
import type { PhysicalCount, CountFormData } from '../types'
import type { Column } from '@/components/ui/data-table'

const schema = z.object({
  warehouseId: z.string().min(1, 'Warehouse ID is required'),
  scheduledDate: z.string().min(1, 'Date is required'),
  notes: z.string(),
})

function statusVariant(status: string): 'success' | 'danger' | 'warning' | 'default' {
  if (status === 'closed') return 'success'
  if (status === 'cancelled') return 'danger'
  if (status === 'in_progress' || status === 'reconciling') return 'warning'
  return 'default'
}

const columns: Column<PhysicalCount>[] = [
  {
    key: 'number',
    header: 'No.',
    className: 'font-mono text-xs',
    render: (c) => c.number || c.id.slice(0, 8),
  },
  { key: 'warehouseName', header: 'Warehouse' },
  {
    key: 'scheduledDate',
    header: 'Scheduled',
    render: (c) => (c.scheduledDate ? new Date(c.scheduledDate).toLocaleDateString() : '—'),
  },
  {
    key: 'scannedCount',
    header: 'Scanned',
    className: 'text-right',
    render: (c) => `${formatNumber(c.scannedCount)} / ${formatNumber(c.itemCount)}`,
  },
  {
    key: 'varianceCount',
    header: 'Variances',
    className: 'text-right',
    render: (c) => (
      <span className={c.varianceCount > 0 ? 'font-semibold text-amber-600' : ''}>
        {formatNumber(c.varianceCount)}
      </span>
    ),
  },
  {
    key: 'status',
    header: 'Status',
    render: (c) => <Badge variant={statusVariant(c.status)}>{c.status.replace(/_/g, ' ')}</Badge>,
  },
]

export function CountsPage() {
  const queryClient = useQueryClient()
  const [statusFilter, setStatusFilter] = useState('')
  const [showCreate, setShowCreate] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['counts', { status: statusFilter }],
    queryFn: () => fetchCounts({ status: statusFilter || undefined }),
  })

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['counts'] })

  const reconcileMut = useMutation({ mutationFn: reconcileCount, onSuccess: invalidate })
  const closeMut = useMutation({ mutationFn: closeCount, onSuccess: invalidate })

  const counts = data?.data ?? []

  return (
    <div className="space-y-4 animate-fade-up">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1>Physical Count</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Schedule, scan, reconcile, and close inventory counts
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            to="/field"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-[var(--color-border)] bg-white px-4 text-sm font-semibold text-[var(--color-ink)] hover:bg-[var(--color-primary-soft)]"
          >
            <Smartphone className="h-4 w-4" /> Field Mode
          </Link>
          <Button onClick={() => setShowCreate(true)}>
            <Plus className="h-4 w-4" /> New Count
          </Button>
        </div>
      </div>

      <select
        value={statusFilter}
        onChange={(e) => setStatusFilter(e.target.value)}
        className="h-9 rounded-md border border-border bg-white px-3 text-sm text-ink shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
      >
        <option value="">All Statuses</option>
        {['draft', 'in_progress', 'reconciling', 'closed'].map((s) => (
          <option key={s} value={s}>
            {s.replace(/_/g, ' ')}
          </option>
        ))}
      </select>

      <DataTable
        columns={columns}
        data={counts}
        keyExtractor={(c) => c.id}
        loading={isLoading}
        emptyIcon={<ClipboardCheck className="h-12 w-12" />}
        emptyTitle="No physical counts"
        emptyDescription="Create a count session to begin inventory verification."
        actions={(item) => (
          <>
            {(item.status === 'in_progress' || item.status === 'draft') && (
              <Button
                variant="ghost"
                size="icon"
                title="Reconcile"
                disabled={reconcileMut.isPending}
                onClick={() => reconcileMut.mutate(item.id)}
              >
                <Scale className="h-3.5 w-3.5" />
              </Button>
            )}
            {item.status === 'reconciling' && (
              <Button
                variant="ghost"
                size="icon"
                title="Close"
                disabled={closeMut.isPending}
                onClick={() => closeMut.mutate(item.id)}
              >
                <Lock className="h-3.5 w-3.5" />
              </Button>
            )}
            <Link
              to={`/field?countId=${item.id}`}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full text-[var(--color-ink)] hover:bg-[var(--color-primary-soft)]"
              title="Open in field mode"
            >
              <Smartphone className="h-3.5 w-3.5" />
            </Link>
          </>
        )}
      />

      {showCreate && (
        <CreateCountModal
          onClose={() => setShowCreate(false)}
          onSaved={() => {
            setShowCreate(false)
            invalidate()
          }}
        />
      )}
    </div>
  )
}

function CreateCountModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const form = useForm<CountFormData & { notes: string }>({
    resolver: zodResolver(schema),
    defaultValues: {
      warehouseId: '',
      scheduledDate: new Date().toISOString().slice(0, 10),
      notes: '',
    },
  })

  const mutation = useMutation({
    mutationFn: (values: CountFormData & { notes: string }) =>
      createCount({
        warehouseId: values.warehouseId,
        scheduledDate: values.scheduledDate,
        notes: values.notes || undefined,
      }),
    onSuccess: onSaved,
  })

  const {
    register,
    control,
    formState: { errors },
  } = form

  return (
    <Modal open onClose={onClose} title="New Physical Count">
      {mutation.isError && (
        <div className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {getApiErrorMessage(mutation.error)}
        </div>
      )}
      <form onSubmit={form.handleSubmit((v) => mutation.mutate(v))} className="space-y-4">
        <Input
          label="Warehouse ID"
          error={errors.warehouseId?.message}
          {...register('warehouseId')}
        />
        <Controller
          name="scheduledDate"
          control={control}
          render={({ field }) => (
            <DatePicker
              label="Scheduled Date"
              value={field.value}
              onChange={field.onChange}
              onBlur={field.onBlur}
              name={field.name}
              error={errors.scheduledDate?.message}
              placeholder="Select scheduled date"
            />
          )}
        />
        <Input label="Notes" {...register('notes')} />
        <div className="flex justify-end gap-2 border-t border-border pt-4">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? <Spinner className="h-4 w-4" /> : null}
            Create
          </Button>
        </div>
      </form>
    </Modal>
  )
}
