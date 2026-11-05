import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, FileText, Check, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Modal } from '@/components/ui/modal'
import { DataTable } from '@/components/ui/data-table'
import { Badge } from '@/components/ui/badge'
import { Spinner } from '@/components/ui/spinner'
import { getApiErrorMessage } from '@/lib/api-client'
import { formatCurrency, formatNumber, cn } from '@/lib/utils'
import { fetchCoaForms, createCoaForm, approveCoaForm, exportCoaForm } from '../api/coa-api'
import type { CoaForm, CoaFormType, CoaFormData } from '../types'
import type { Column } from '@/components/ui/data-table'

const FORM_TABS: CoaFormType[] = ['ICS', 'PAR', 'RPCPPE', 'IIRUP', 'WMR']

const TAB_LABELS: Record<CoaFormType, string> = {
  ICS: 'ICS',
  PAR: 'PAR',
  RPCPPE: 'RPCPPE',
  IIRUP: 'IIRUP',
  WMR: 'WMR',
}

const schema = z.object({
  title: z.string().min(1, 'Title is required'),
  custodian: z.string().min(1, 'Custodian is required'),
  office: z.string().min(1, 'Office is required'),
  remarks: z.string(),
  description: z.string().min(1, 'Item description is required'),
  quantity: z.number().min(1),
  unitCost: z.number().min(0),
  propertyNumber: z.string(),
})

type FormValues = z.infer<typeof schema>

function statusVariant(status: string): 'success' | 'danger' | 'warning' | 'default' {
  if (status === 'approved') return 'success'
  if (status === 'cancelled') return 'danger'
  if (status === 'pending') return 'warning'
  return 'default'
}

const columns: Column<CoaForm>[] = [
  { key: 'number', header: 'No.', className: 'font-mono text-xs', render: (f) => f.number || f.id.slice(0, 8) },
  { key: 'title', header: 'Title', render: (f) => <span className="font-medium">{f.title}</span> },
  { key: 'custodian', header: 'Custodian' },
  { key: 'office', header: 'Office' },
  {
    key: 'itemCount',
    header: 'Items',
    className: 'text-right',
    render: (f) => formatNumber(f.itemCount),
  },
  {
    key: 'totalAmount',
    header: 'Amount',
    className: 'text-right',
    render: (f) => formatCurrency(f.totalAmount),
  },
  {
    key: 'status',
    header: 'Status',
    render: (f) => <Badge variant={statusVariant(f.status)}>{f.status}</Badge>,
  },
  {
    key: 'createdAt',
    header: 'Date',
    render: (f) => (f.createdAt ? new Date(f.createdAt).toLocaleDateString() : '—'),
  },
]

export function CoaPage() {
  const queryClient = useQueryClient()
  const [tab, setTab] = useState<CoaFormType>('ICS')
  const [showCreate, setShowCreate] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['coa', { formType: tab }],
    queryFn: () => fetchCoaForms({ formType: tab }),
  })

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['coa'] })

  const approveMut = useMutation({
    mutationFn: approveCoaForm,
    onSuccess: invalidate,
  })

  const exportMut = useMutation({
    mutationFn: async (id: string) => {
      const blob = await exportCoaForm(id, 'csv')
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `coa-${id}.csv`
      a.click()
      URL.revokeObjectURL(url)
    },
  })

  const forms = data?.data ?? []

  return (
    <div className="space-y-4 animate-fade-up">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1>COA Forms</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            ICS, PAR, RPCPPE, IIRUP, and WMR accountability documents
          </p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="h-4 w-4" /> New {tab}
        </Button>
      </div>

      <div className="flex flex-wrap gap-1 rounded-full bg-[var(--color-primary-soft)] p-1 w-fit">
        {FORM_TABS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={cn(
              'rounded-full px-3 py-1.5 text-sm font-medium transition',
              tab === t
                ? 'bg-white text-[var(--color-ink)] shadow-sm'
                : 'text-[var(--color-muted-foreground)] hover:text-[var(--color-ink)]',
            )}
          >
            {TAB_LABELS[t]}
          </button>
        ))}
      </div>

      <DataTable
        columns={columns}
        data={forms}
        keyExtractor={(f) => f.id}
        loading={isLoading}
        emptyIcon={<FileText className="h-12 w-12" />}
        emptyTitle={`No ${tab} forms`}
        emptyDescription={`Create a ${tab} form to document property accountability.`}
        actions={(item) => (
          <>
            {(item.status === 'draft' || item.status === 'pending') && (
              <Button
                variant="ghost"
                size="icon"
                title="Approve"
                disabled={approveMut.isPending}
                onClick={() => approveMut.mutate(item.id)}
              >
                <Check className="h-3.5 w-3.5 text-emerald-600" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              title="Export CSV"
              disabled={exportMut.isPending}
              onClick={() => exportMut.mutate(item.id)}
            >
              <Download className="h-3.5 w-3.5" />
            </Button>
          </>
        )}
      />

      {showCreate && (
        <CreateCoaModal
          formType={tab}
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

function CreateCoaModal({
  formType,
  onClose,
  onSaved,
}: {
  formType: CoaFormType
  onClose: () => void
  onSaved: () => void
}) {
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: '',
      custodian: '',
      office: '',
      remarks: '',
      description: '',
      quantity: 1,
      unitCost: 0,
      propertyNumber: '',
    },
  })

  const mutation = useMutation({
    mutationFn: (values: FormValues) => {
      const payload: CoaFormData = {
        formType,
        title: values.title,
        custodian: values.custodian,
        office: values.office,
        documentDate: new Date().toISOString().slice(0, 10),
        remarks: values.remarks || undefined,
        lines: [
          {
            description: values.description,
            quantity: values.quantity,
            unitCost: values.unitCost,
            propertyNumber: values.propertyNumber || undefined,
          },
        ],
      }
      return createCoaForm(payload)
    },
    onSuccess: onSaved,
  })

  const { register, formState: { errors } } = form

  return (
    <Modal open onClose={onClose} title={`New ${formType}`} size="lg">
      {mutation.isError && (
        <div className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {getApiErrorMessage(mutation.error)}
        </div>
      )}
      <form onSubmit={form.handleSubmit((v) => mutation.mutate(v))} className="space-y-4">
        <Input label="Title" error={errors.title?.message} {...register('title')} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Custodian" error={errors.custodian?.message} {...register('custodian')} />
          <Input label="Office" error={errors.office?.message} {...register('office')} />
        </div>
        <Textarea label="Remarks" rows={2} {...register('remarks')} />
        <div className="rounded-xl border border-border p-4 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Line Item</p>
          <Input label="Description" error={errors.description?.message} {...register('description')} />
          <div className="grid gap-4 sm:grid-cols-3">
            <Input label="Qty" type="number" min={1} {...register('quantity', { valueAsNumber: true })} />
            <Input label="Unit Cost" type="number" min={0} step="0.01" {...register('unitCost', { valueAsNumber: true })} />
            <Input label="Property No." {...register('propertyNumber')} />
          </div>
        </div>
        <div className="flex justify-end gap-2 border-t border-border pt-4">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? <Spinner className="h-4 w-4" /> : null}
            Create
          </Button>
        </div>
      </form>
    </Modal>
  )
}
