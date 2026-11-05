import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Building2, Plus, Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { DataTable } from '@/components/ui/data-table'
import { Spinner } from '@/components/ui/spinner'
import { getApiErrorMessage } from '@/lib/api-client'
import {
  fetchOrganization,
  updateOrganization,
  fetchDepartments,
  createDepartment,
  updateDepartment,
  deleteDepartment,
} from '../api/organization-api'
import type { Organization, Department } from '../types'
import type { Column } from '@/components/ui/data-table'

/* ─── Organization Info ─────────────────────────────────────────────── */

const orgSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  address: z.string(),
  contactEmail: z.string().email('Valid email required').or(z.literal('')),
  contactPhone: z.string(),
})

type OrgFormValues = z.infer<typeof orgSchema>

function OrgInfoSection() {
  const queryClient = useQueryClient()
  const [editing, setEditing] = useState(false)

  const { data: org, isLoading } = useQuery<Organization>({
    queryKey: ['organization'],
    queryFn: fetchOrganization,
  })

  const form = useForm<OrgFormValues>({
    resolver: zodResolver(orgSchema),
    values: {
      name: org?.name ?? '',
      address: org?.address ?? '',
      contactEmail: org?.contactEmail ?? '',
      contactPhone: org?.contactPhone ?? '',
    },
  })

  const mutation = useMutation({
    mutationFn: (values: OrgFormValues) => updateOrganization(values),
    onSuccess: () => {
      setEditing(false)
      queryClient.invalidateQueries({ queryKey: ['organization'] })
    },
  })

  const onSubmit = form.handleSubmit((v) => mutation.mutate(v))
  const {
    register,
    formState: { errors },
  } = form

  if (isLoading) {
    return (
      <div className="uims-card p-6">
        <div className="flex justify-center py-8">
          <Spinner />
        </div>
      </div>
    )
  }

  return (
    <div className="uims-card">
      <div className="flex items-center justify-between border-b border-border px-6 py-4">
        <h2 className="text-sm font-semibold text-ink">Organization Details</h2>
        {!editing && (
          <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
            <Pencil className="h-3.5 w-3.5" /> Edit
          </Button>
        )}
      </div>

      {editing ? (
        <form onSubmit={onSubmit} className="space-y-4 p-6">
          {mutation.isError && (
            <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
              {getApiErrorMessage(mutation.error)}
            </div>
          )}
          <Input label="Organization Name" error={errors.name?.message} {...register('name')} />
          <Input label="Address" {...register('address')} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Contact Email"
              type="email"
              error={errors.contactEmail?.message}
              {...register('contactEmail')}
            />
            <Input label="Contact Phone" {...register('contactPhone')} />
          </div>
          <div className="flex gap-2 pt-2">
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? <Spinner className="h-4 w-4" /> : null}
              Save
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setEditing(false)
                form.reset()
              }}
            >
              Cancel
            </Button>
          </div>
        </form>
      ) : (
        <dl className="grid gap-4 p-6 sm:grid-cols-2">
          <div>
            <dt className="text-xs font-medium uppercase text-muted-foreground">Name</dt>
            <dd className="mt-0.5 text-sm text-ink">{org?.name || '—'}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase text-muted-foreground">Slug</dt>
            <dd className="mt-0.5 font-mono text-sm text-ink">{org?.slug || '—'}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase text-muted-foreground">Address</dt>
            <dd className="mt-0.5 text-sm text-ink">{org?.address || '—'}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase text-muted-foreground">Contact Email</dt>
            <dd className="mt-0.5 text-sm text-ink">{org?.contactEmail || '—'}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase text-muted-foreground">Contact Phone</dt>
            <dd className="mt-0.5 text-sm text-ink">{org?.contactPhone || '—'}</dd>
          </div>
        </dl>
      )}
    </div>
  )
}

/* ─── Departments ───────────────────────────────────────────────────── */

const deptSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  code: z.string().min(1, 'Code is required'),
  headName: z.string(),
})

type DeptFormValues = z.infer<typeof deptSchema>

type DeptModal =
  | { mode: 'closed' }
  | { mode: 'create' }
  | { mode: 'edit'; dept: Department }
  | { mode: 'delete'; dept: Department }

const deptColumns: Column<Department>[] = [
  { key: 'code', header: 'Code', className: 'font-mono text-xs', render: (d) => d.code },
  {
    key: 'name',
    header: 'Department',
    render: (d) => <span className="font-medium">{d.name}</span>,
  },
  {
    key: 'headName',
    header: 'Head',
    render: (d) => d.headName || <span className="text-muted-foreground">—</span>,
  },
]

function DepartmentsSection() {
  const queryClient = useQueryClient()
  const [modal, setModal] = useState<DeptModal>({ mode: 'closed' })

  const { data: departments = [], isLoading } = useQuery<Department[]>({
    queryKey: ['departments'],
    queryFn: fetchDepartments,
  })

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-ink">Departments</h2>
        <Button size="sm" onClick={() => setModal({ mode: 'create' })}>
          <Plus className="h-3.5 w-3.5" /> Add
        </Button>
      </div>

      <DataTable
        columns={deptColumns}
        data={departments}
        keyExtractor={(d) => d.id}
        loading={isLoading}
        emptyIcon={<Building2 className="h-10 w-10" />}
        emptyTitle="No departments"
        emptyDescription="Add departments to organize your inventory by unit."
        actions={(dept) => (
          <>
            <Button variant="ghost" size="icon" onClick={() => setModal({ mode: 'edit', dept })}>
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setModal({ mode: 'delete', dept })}>
              <Trash2 className="h-3.5 w-3.5 text-red-500" />
            </Button>
          </>
        )}
      />

      {(modal.mode === 'create' || modal.mode === 'edit') && (
        <DeptFormModal
          mode={modal.mode}
          dept={modal.mode === 'edit' ? modal.dept : undefined}
          onClose={() => setModal({ mode: 'closed' })}
          onSaved={() => {
            setModal({ mode: 'closed' })
            queryClient.invalidateQueries({ queryKey: ['departments'] })
          }}
        />
      )}

      {modal.mode === 'delete' && (
        <DeleteDeptModal
          dept={modal.dept}
          onClose={() => setModal({ mode: 'closed' })}
          onDeleted={() => {
            setModal({ mode: 'closed' })
            queryClient.invalidateQueries({ queryKey: ['departments'] })
          }}
        />
      )}
    </div>
  )
}

function DeptFormModal({
  mode,
  dept,
  onClose,
  onSaved,
}: {
  mode: 'create' | 'edit'
  dept?: Department
  onClose: () => void
  onSaved: () => void
}) {
  const form = useForm<DeptFormValues>({
    resolver: zodResolver(deptSchema),
    defaultValues: {
      name: dept?.name ?? '',
      code: dept?.code ?? '',
      headName: dept?.headName ?? '',
    },
  })

  const mutation = useMutation({
    mutationFn: (values: DeptFormValues) =>
      mode === 'edit' && dept ? updateDepartment(dept.id, values) : createDepartment(values),
    onSuccess: onSaved,
  })

  const onSubmit = form.handleSubmit((v) => mutation.mutate(v))
  const {
    register,
    formState: { errors },
  } = form

  return (
    <Modal
      open
      onClose={onClose}
      title={mode === 'create' ? 'Add Department' : 'Edit Department'}
      size="sm"
    >
      {mutation.isError && (
        <div className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {getApiErrorMessage(mutation.error)}
        </div>
      )}
      <form onSubmit={onSubmit} className="space-y-4">
        <Input label="Name" error={errors.name?.message} {...register('name')} />
        <Input
          label="Code"
          placeholder="e.g. DEPT-IT"
          error={errors.code?.message}
          {...register('code')}
        />
        <Input label="Department Head" placeholder="Full name" {...register('headName')} />
        <div className="flex justify-end gap-2 border-t border-border pt-4">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? <Spinner className="h-4 w-4" /> : null}
            {mode === 'create' ? 'Create' : 'Save'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

function DeleteDeptModal({
  dept,
  onClose,
  onDeleted,
}: {
  dept: Department
  onClose: () => void
  onDeleted: () => void
}) {
  const mutation = useMutation({
    mutationFn: () => deleteDepartment(dept.id),
    onSuccess: onDeleted,
  })

  return (
    <Modal open onClose={onClose} title="Delete Department" size="sm">
      <p className="text-sm text-muted-foreground">
        Delete department <strong className="text-ink">{dept.name}</strong>? Items linked to this
        department will be unlinked.
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

/* ─── Main Page ─────────────────────────────────────────────────────── */

export function OrganizationPage() {
  return (
    <div className="space-y-8 animate-fade-up">
      <OrgInfoSection />
      <DepartmentsSection />
    </div>
  )
}
