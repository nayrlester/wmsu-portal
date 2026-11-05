import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, ClipboardList, Send, Check, X, PackageCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Modal } from '@/components/ui/modal'
import { DataTable } from '@/components/ui/data-table'
import { Badge } from '@/components/ui/badge'
import { Spinner } from '@/components/ui/spinner'
import { getApiErrorMessage } from '@/lib/api-client'
import { formatNumber } from '@/lib/utils'
import {
  fetchRequisitions,
  fetchRequisition,
  createRequisition,
  submitRequisition,
  approveRequisition,
  rejectRequisition,
  fulfillRequisition,
} from '../api/requisitions-api'
import type { Requisition, RequisitionFormData } from '../types'
import type { Column } from '@/components/ui/data-table'

const schema = z.object({
  department: z.string().min(1, 'Department is required'),
  purpose: z.string().min(1, 'Purpose is required'),
  itemId: z.string().uuid('Valid item UUID required'),
  quantity: z.number().min(1),
  lineNotes: z.string(),
})

type FormValues = z.infer<typeof schema>

function statusVariant(status: string): 'success' | 'danger' | 'warning' | 'default' {
  if (status === 'approved' || status === 'fulfilled') return 'success'
  if (status === 'rejected' || status === 'cancelled') return 'danger'
  if (status === 'submitted') return 'warning'
  return 'default'
}

const columns: Column<Requisition>[] = [
  {
    key: 'number',
    header: 'No.',
    className: 'font-mono text-xs',
    render: (r) => r.number || r.id.slice(0, 8),
  },
  { key: 'department', header: 'Department', render: (r) => r.department || '—' },
  {
    key: 'purpose',
    header: 'Purpose',
    render: (r) => <span className="line-clamp-1 max-w-[220px]">{r.purpose}</span>,
  },
  {
    key: 'lines',
    header: 'Lines',
    className: 'text-right',
    render: (r) => formatNumber(r.lines?.length ?? 0),
  },
  { key: 'requestedBy', header: 'Requested By', render: (r) => r.requestedBy || '—' },
  {
    key: 'status',
    header: 'Status',
    render: (r) => <Badge variant={statusVariant(r.status)}>{r.status}</Badge>,
  },
  {
    key: 'createdAt',
    header: 'Date',
    render: (r) => (r.createdAt ? new Date(r.createdAt).toLocaleDateString() : '—'),
  },
]

export function RequisitionsPage() {
  const queryClient = useQueryClient()
  const [statusFilter, setStatusFilter] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [rejectTarget, setRejectTarget] = useState<Requisition | null>(null)
  const [fulfillTarget, setFulfillTarget] = useState<Requisition | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['requisitions', { status: statusFilter }],
    queryFn: () => fetchRequisitions({ status: statusFilter || undefined }),
  })

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['requisitions'] })

  const submitMut = useMutation({ mutationFn: submitRequisition, onSuccess: invalidate })
  const approveMut = useMutation({ mutationFn: approveRequisition, onSuccess: invalidate })

  const requisitions = data?.data ?? []

  return (
    <div className="space-y-4 animate-fade-up">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1>Requisitions</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Request, approve, and fulfill supply issuances
          </p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="h-4 w-4" /> New Requisition
        </Button>
      </div>

      <select
        value={statusFilter}
        onChange={(e) => setStatusFilter(e.target.value)}
        className="h-9 rounded-md border border-border bg-white px-3 text-sm text-ink shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
      >
        <option value="">All Statuses</option>
        {['draft', 'submitted', 'approved', 'rejected', 'fulfilled'].map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>

      <DataTable
        columns={columns}
        data={requisitions}
        keyExtractor={(r) => r.id}
        loading={isLoading}
        emptyIcon={<ClipboardList className="h-12 w-12" />}
        emptyTitle="No requisitions"
        emptyDescription="Create a requisition to request supplies from the warehouse."
        actions={(item) => (
          <>
            {item.status === 'draft' && (
              <Button
                variant="ghost"
                size="icon"
                title="Submit"
                disabled={submitMut.isPending}
                onClick={() => submitMut.mutate(item.id)}
              >
                <Send className="h-3.5 w-3.5" />
              </Button>
            )}
            {item.status === 'submitted' && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  title="Approve"
                  disabled={approveMut.isPending}
                  onClick={() => approveMut.mutate(item.id)}
                >
                  <Check className="h-3.5 w-3.5 text-emerald-600" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  title="Reject"
                  onClick={() => setRejectTarget(item)}
                >
                  <X className="h-3.5 w-3.5 text-red-500" />
                </Button>
              </>
            )}
            {item.status === 'approved' && (
              <Button
                variant="ghost"
                size="icon"
                title="Fulfill"
                onClick={() => setFulfillTarget(item)}
              >
                <PackageCheck className="h-3.5 w-3.5" />
              </Button>
            )}
          </>
        )}
      />

      {showCreate && (
        <CreateModal
          onClose={() => setShowCreate(false)}
          onSaved={() => {
            setShowCreate(false)
            invalidate()
          }}
        />
      )}

      {rejectTarget && (
        <RejectModal
          item={rejectTarget}
          onClose={() => setRejectTarget(null)}
          onDone={() => {
            setRejectTarget(null)
            invalidate()
          }}
        />
      )}

      {fulfillTarget && (
        <FulfillModal
          item={fulfillTarget}
          onClose={() => setFulfillTarget(null)}
          onDone={() => {
            setFulfillTarget(null)
            invalidate()
          }}
        />
      )}
    </div>
  )
}

function CreateModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { department: '', purpose: '', itemId: '', quantity: 1, lineNotes: '' },
  })

  const mutation = useMutation({
    mutationFn: (values: FormValues) => {
      const payload: RequisitionFormData = {
        department: values.department,
        purpose: values.purpose,
        lines: [
          {
            itemId: values.itemId,
            quantity: values.quantity,
            notes: values.lineNotes || undefined,
          },
        ],
      }
      return createRequisition(payload)
    },
    onSuccess: onSaved,
  })

  const {
    register,
    formState: { errors },
  } = form

  return (
    <Modal open onClose={onClose} title="New Requisition">
      {mutation.isError && (
        <div className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {getApiErrorMessage(mutation.error)}
        </div>
      )}
      <form onSubmit={form.handleSubmit((v) => mutation.mutate(v))} className="space-y-4">
        <Input label="Department" error={errors.department?.message} {...register('department')} />
        <Textarea
          label="Purpose"
          rows={2}
          error={errors.purpose?.message}
          {...register('purpose')}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Item ID" error={errors.itemId?.message} {...register('itemId')} />
          <Input
            label="Quantity"
            type="number"
            min={1}
            error={errors.quantity?.message}
            {...register('quantity', { valueAsNumber: true })}
          />
        </div>
        <Input label="Line Notes" {...register('lineNotes')} />
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

function RejectModal({
  item,
  onClose,
  onDone,
}: {
  item: Requisition
  onClose: () => void
  onDone: () => void
}) {
  const [reason, setReason] = useState('')
  const mutation = useMutation({
    mutationFn: () => rejectRequisition(item.id, reason),
    onSuccess: onDone,
  })

  return (
    <Modal open onClose={onClose} title="Reject Requisition" size="sm">
      {mutation.isError && (
        <div className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {getApiErrorMessage(mutation.error)}
        </div>
      )}
      <Textarea
        label="Reason"
        rows={3}
        value={reason}
        onChange={(e) => setReason(e.target.value)}
      />
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button
          variant="destructive"
          disabled={mutation.isPending}
          onClick={() => mutation.mutate()}
        >
          {mutation.isPending ? <Spinner className="h-4 w-4" /> : null}
          Reject
        </Button>
      </div>
    </Modal>
  )
}

function FulfillModal({
  item,
  onClose,
  onDone,
}: {
  item: Requisition
  onClose: () => void
  onDone: () => void
}) {
  const [warehouseId, setWarehouseId] = useState('')
  const detailQuery = useQuery({
    queryKey: ['requisition', item.id],
    queryFn: () => fetchRequisition(item.id),
  })

  const mutation = useMutation({
    mutationFn: async () => {
      const detail = detailQuery.data ?? (await fetchRequisition(item.id))
      const lines = detail.lines
        .filter((l) => l.id)
        .map((l) => ({
          lineId: l.id!,
          quantityIssued:
            l.quantityApproved && l.quantityApproved > 0 ? l.quantityApproved : l.quantity,
        }))
      if (lines.length === 0) throw new Error('No requisition lines to fulfill')
      return fulfillRequisition(item.id, { warehouseId, lines })
    },
    onSuccess: onDone,
  })

  return (
    <Modal open onClose={onClose} title="Fulfill Requisition" size="sm">
      {mutation.isError && (
        <div className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {getApiErrorMessage(mutation.error)}
        </div>
      )}
      {detailQuery.isLoading ? (
        <div className="flex justify-center py-6">
          <Spinner />
        </div>
      ) : (
        <div className="space-y-4">
          <Input
            label="Warehouse ID"
            value={warehouseId}
            onChange={(e) => setWarehouseId(e.target.value)}
            placeholder="UUID of issuing warehouse"
          />
          <p className="text-xs text-muted-foreground">
            {detailQuery.data?.lines.length ?? item.lines.length} line(s) will be issued from this
            warehouse.
          </p>
          <div className="flex justify-end gap-2 border-t border-border pt-4">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              disabled={mutation.isPending || !warehouseId.trim()}
              onClick={() => mutation.mutate()}
            >
              {mutation.isPending ? <Spinner className="h-4 w-4" /> : null}
              Fulfill
            </Button>
          </div>
        </div>
      )}
    </Modal>
  )
}
