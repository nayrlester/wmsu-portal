import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Pencil, Plus, Shield, Trash2 } from 'lucide-react'
import { WidgetCard } from '@/components/desk-app'
import { FormModal } from '@/components/desk-app/forms/form-modal'
import { useConfirm } from '@/components/desk-app/ux/confirm-dialog-provider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  useCreateRole,
  useDeleteRole,
  usePermissionCatalog,
  useRoles,
  useUpdateRole,
  useUpdateRolePermissions,
} from '@/hooks/use-api'
import { ApiError } from '@/api/errors/api-error'
import { permissionsApi } from '@/lib/api'
import { toast } from '@/shared/store/toast-store'
import { useAuthStore } from '@/stores/auth-store'
import type { PermissionCatalog, RolePermissionRecord, RoleRecord } from '@/types/api'

const createSchema = z.object({
  name: z.string().trim().min(2, 'Name is required'),
  slug: z
    .string()
    .trim()
    .min(2, 'Slug is required')
    .max(100)
    .regex(/^[a-z0-9_]+$/, 'Use lowercase letters, numbers, and underscores'),
  description: z.string().trim().max(500).optional().or(z.literal('')),
  permissionIds: z.array(z.string()),
})

const editSchema = z.object({
  name: z.string().trim().min(2, 'Name is required'),
  description: z.string().trim().max(500).optional().or(z.literal('')),
  permissionIds: z.array(z.string()),
})

type CreateFormData = z.infer<typeof createSchema>
type EditFormData = z.infer<typeof editSchema>

function showApiError(title: string, err: unknown) {
  const message = err instanceof ApiError ? err.message : 'Something went wrong. Please try again.'
  toast.error(title, message)
}

function suggestSlug(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '')
    .slice(0, 100)
}

function formatModuleLabel(module: string): string {
  return module
    .split(/[_-]/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function PermissionPicker({
  catalog,
  selectedIds,
  onChange,
  idPrefix,
}: {
  catalog: PermissionCatalog
  selectedIds: string[]
  onChange: (ids: string[]) => void
  idPrefix: string
}) {
  const modules = useMemo(() => Object.keys(catalog).sort(), [catalog])

  const toggle = (permissionId: string, checked: boolean) => {
    if (checked) {
      onChange(Array.from(new Set([...selectedIds, permissionId])))
      return
    }
    onChange(selectedIds.filter((id) => id !== permissionId))
  }

  const toggleModule = (permissions: RolePermissionRecord[], checked: boolean) => {
    const moduleIds = permissions.map((p) => p.id)
    if (checked) {
      onChange(Array.from(new Set([...selectedIds, ...moduleIds])))
      return
    }
    onChange(selectedIds.filter((id) => !moduleIds.includes(id)))
  }

  if (modules.length === 0) {
    return <p className="text-sm text-muted-foreground">No permissions available.</p>
  }

  return (
    <div className="max-h-72 space-y-4 overflow-y-auto rounded-lg border border-border p-3">
      {modules.map((module) => {
        const permissions = catalog[module] ?? []
        const moduleIds = permissions.map((p) => p.id)
        const selectedCount = moduleIds.filter((id) => selectedIds.includes(id)).length
        const allSelected = selectedCount === permissions.length && permissions.length > 0
        const someSelected = selectedCount > 0 && !allSelected

        return (
          <div key={module} className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-medium">
              <input
                type="checkbox"
                className="rounded border-border"
                checked={allSelected}
                ref={(el) => {
                  if (el) el.indeterminate = someSelected
                }}
                onChange={(event) => toggleModule(permissions, event.target.checked)}
              />
              {formatModuleLabel(module)}
              <span className="text-xs font-normal text-muted-foreground">
                ({selectedCount}/{permissions.length})
              </span>
            </label>
            <ul className="ml-6 space-y-1">
              {permissions.map((permission) => (
                <li key={permission.id}>
                  <label className="flex items-start gap-2 text-sm">
                    <input
                      type="checkbox"
                      className="mt-0.5 rounded border-border"
                      id={`${idPrefix}-${permission.id}`}
                      checked={selectedIds.includes(permission.id)}
                      onChange={(event) => toggle(permission.id, event.target.checked)}
                    />
                    <span>
                      <span className="font-medium">{permission.name}</span>
                      <span className="ml-2 font-mono text-xs text-muted-foreground">{permission.slug}</span>
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          </div>
        )
      })}
    </div>
  )
}

export function RolesPanel() {
  const confirm = useConfirm()
  const [showCreate, setShowCreate] = useState(false)
  const [editing, setEditing] = useState<RoleRecord | null>(null)

  const { data: roles, isLoading } = useRoles()
  const { data: permissionCatalog, isLoading: catalogLoading } = usePermissionCatalog()
  const createMutation = useCreateRole()
  const updateMutation = useUpdateRole()
  const updatePermissionsMutation = useUpdateRolePermissions()
  const deleteMutation = useDeleteRole()
  const setPermissions = useAuthStore((s) => s.setPermissions)

  const catalog = permissionCatalog?.permissions ?? {}

  const refreshMyPermissions = async () => {
    try {
      const { permissions } = await permissionsApi.mine()
      setPermissions(Array.isArray(permissions) ? permissions : [])
    } catch {
      // Sidebar/guards will recover on next layout refresh.
    }
  }

  const createForm = useForm<CreateFormData>({
    resolver: zodResolver(createSchema),
    defaultValues: { name: '', slug: '', description: '', permissionIds: [] },
  })

  const editForm = useForm<EditFormData>({
    resolver: zodResolver(editSchema),
    defaultValues: { name: '', description: '', permissionIds: [] },
  })

  const createName = createForm.watch('name')

  useEffect(() => {
    if (!showCreate) return
    const slug = createForm.getValues('slug')
    if (!slug) {
      createForm.setValue('slug', suggestSlug(createName))
    }
  }, [createName, showCreate, createForm])

  const openEdit = (role: RoleRecord) => {
    setEditing(role)
    editForm.reset({
      name: role.name,
      description: role.description ?? '',
      permissionIds: role.permissions?.map((p) => p.id) ?? [],
    })
  }

  const closeEditModal = () => {
    setEditing(null)
    editForm.reset({ name: '', description: '', permissionIds: [] })
  }

  const onCreate = async (form: CreateFormData) => {
    try {
      await createMutation.mutateAsync({
        name: form.name.trim(),
        slug: form.slug.trim(),
        description: form.description?.trim() || undefined,
        permissionIds: form.permissionIds,
      })
      toast.success('Role created')
      createForm.reset()
      setShowCreate(false)
    } catch (err) {
      showApiError('Could not create role', err)
    }
  }

  const onEdit = async (form: EditFormData) => {
    if (!editing) return

    try {
      if (!editing.isSystem) {
        await updateMutation.mutateAsync({
          id: editing.id,
          name: form.name.trim(),
          description: form.description?.trim() || null,
        })
      }

      await updatePermissionsMutation.mutateAsync({
        id: editing.id,
        permissionIds: form.permissionIds,
      })

      await refreshMyPermissions()
      toast.success('Role updated')
      closeEditModal()
    } catch (err) {
      showApiError('Could not update role', err)
    }
  }

  const handleDelete = async (role: RoleRecord) => {
    const confirmed = await confirm({
      title: 'Delete role',
      description: `Delete "${role.name}"? This cannot be undone.`,
      confirmLabel: 'Delete',
      variant: 'destructive',
    })

    if (!confirmed) return

    try {
      await deleteMutation.mutateAsync(role.id)
      toast.success('Role deleted')
    } catch (err) {
      showApiError('Could not delete role', err)
    }
  }

  const isSaving = updateMutation.isPending || updatePermissionsMutation.isPending

  return (
    <>
      <WidgetCard
        title="Roles & permissions"
        action={
          <Button size="sm" variant={showCreate ? 'outline' : 'default'} onClick={() => setShowCreate((v) => !v)}>
            <Plus className="h-4 w-4" aria-hidden />
            Add role
          </Button>
        }
      >
        {showCreate && (
          <form
            onSubmit={createForm.handleSubmit(onCreate)}
            className="mb-6 grid max-w-2xl gap-4 rounded-lg border border-border p-4"
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="role-name">Name</Label>
                <Input id="role-name" {...createForm.register('name')} />
                {createForm.formState.errors.name && (
                  <p className="text-xs text-destructive">{createForm.formState.errors.name.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="role-slug">Slug</Label>
                <Input id="role-slug" placeholder="custom_role" {...createForm.register('slug')} />
                {createForm.formState.errors.slug && (
                  <p className="text-xs text-destructive">{createForm.formState.errors.slug.message}</p>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="role-desc">Description</Label>
              <Textarea id="role-desc" rows={2} {...createForm.register('description')} />
            </div>
            <div className="space-y-2">
              <Label>Functions (permissions)</Label>
              {catalogLoading ? (
                <Skeleton className="h-32 w-full" />
              ) : (
                <PermissionPicker
                  catalog={catalog}
                  selectedIds={createForm.watch('permissionIds')}
                  onChange={(ids) => createForm.setValue('permissionIds', ids, { shouldDirty: true })}
                  idPrefix="create"
                />
              )}
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? 'Saving…' : 'Save role'}
              </Button>
              <Button type="button" variant="outline" onClick={() => setShowCreate(false)}>
                Cancel
              </Button>
            </div>
          </form>
        )}

        {isLoading ? (
          <Skeleton className="h-32 w-full" />
        ) : !roles?.length ? (
          <div className="flex flex-col items-center gap-2 py-10 text-center text-muted-foreground">
            <Shield className="h-8 w-8 opacity-50" aria-hidden />
            <p>No roles yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-2 py-2 font-medium">Name</th>
                  <th className="px-2 py-2 font-medium">Type</th>
                  <th className="px-2 py-2 font-medium">Functions</th>
                  <th className="px-2 py-2 font-medium" />
                </tr>
              </thead>
              <tbody>
                {roles.map((role) => (
                  <tr key={role.id} className="border-b border-border/60">
                    <td className="px-2 py-3">
                      <p className="font-medium">{role.name}</p>
                      {role.description && (
                        <p className="mt-0.5 text-xs text-muted-foreground">{role.description}</p>
                      )}
                      <p className="mt-0.5 font-mono text-xs text-muted-foreground">{role.slug}</p>
                    </td>
                    <td className="px-2 py-3">
                      <Badge variant={role.isSystem ? 'secondary' : 'outline'}>
                        {role.isSystem ? 'System' : 'Custom'}
                      </Badge>
                    </td>
                    <td className="px-2 py-3 text-muted-foreground">
                      {role.permissions?.length ?? 0} permission{(role.permissions?.length ?? 0) === 1 ? '' : 's'}
                    </td>
                    <td className="px-2 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="sm" onClick={() => openEdit(role)}>
                          <Pencil className="h-4 w-4" aria-hidden />
                          Edit
                        </Button>
                        {!role.isSystem && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            disabled={deleteMutation.isPending}
                            onClick={() => handleDelete(role)}
                          >
                            <Trash2 className="h-4 w-4" aria-hidden />
                            Delete
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </WidgetCard>

      <FormModal
        open={Boolean(editing)}
        onOpenChange={(open) => {
          if (!open) closeEditModal()
        }}
        title={editing?.isSystem ? 'Edit role permissions' : 'Edit role'}
        description={
          editing?.isSystem
            ? 'System role names are fixed. Update which functions this role can perform.'
            : 'Update role details and assigned functions.'
        }
        form={editForm}
        onSubmit={onEdit}
        submitLabel="Save changes"
        loading={isSaving}
      >
        {!editing?.isSystem && (
          <>
            <div className="space-y-2">
              <Label htmlFor="edit-role-name">Name</Label>
              <Input id="edit-role-name" {...editForm.register('name')} />
              {editForm.formState.errors.name && (
                <p className="text-xs text-destructive">{editForm.formState.errors.name.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-role-desc">Description</Label>
              <Textarea id="edit-role-desc" rows={2} {...editForm.register('description')} />
            </div>
          </>
        )}
        {editing?.isSystem && (
          <div className="rounded-md border border-border bg-muted/40 px-3 py-2 text-sm">
            <p className="font-medium">{editing.name}</p>
            <p className="font-mono text-xs text-muted-foreground">{editing.slug}</p>
          </div>
        )}
        <div className="space-y-2">
          <Label>Functions (permissions)</Label>
          {catalogLoading ? (
            <Skeleton className="h-32 w-full" />
          ) : (
            <PermissionPicker
              catalog={catalog}
              selectedIds={editForm.watch('permissionIds')}
              onChange={(ids) => editForm.setValue('permissionIds', ids, { shouldDirty: true })}
              idPrefix="edit"
            />
          )}
        </div>
      </FormModal>
    </>
  )
}
