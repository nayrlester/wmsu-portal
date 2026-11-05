import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { FileType2, Pencil, Plus } from 'lucide-react'
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
  useCatalogDocumentTypes,
  useCreateDocumentType,
  useDeactivateDocumentType,
  useUpdateDocumentType,
} from '@/hooks/use-api'
import { ApiError } from '@/api/errors/api-error'
import { toast } from '@/shared/store/toast-store'
import type { CatalogDocumentTypeRecord } from '@/features/documents/types/document.types'

const codeSchema = z
  .string()
  .trim()
  .min(1, 'Code is required')
  .max(50)
  .regex(/^[A-Za-z0-9_-]+$/, 'Use letters, numbers, hyphens, or underscores')

const createSchema = z.object({
  name: z.string().trim().min(2, 'Name is required'),
  code: codeSchema,
  description: z.string().trim().max(2000).optional().or(z.literal('')),
})

const editSchema = createSchema.extend({
  isActive: z.boolean(),
})

type CreateFormData = z.infer<typeof createSchema>
type EditFormData = z.infer<typeof editSchema>

function showApiError(title: string, err: unknown) {
  const message = err instanceof ApiError ? err.message : 'Something went wrong. Please try again.'
  toast.error(title, message)
}

export function DocumentTypesPanel() {
  const confirm = useConfirm()
  const [showCreate, setShowCreate] = useState(false)
  const [editing, setEditing] = useState<CatalogDocumentTypeRecord | null>(null)

  const { data, isLoading } = useCatalogDocumentTypes()
  const createMutation = useCreateDocumentType()
  const updateMutation = useUpdateDocumentType()
  const deactivateMutation = useDeactivateDocumentType()

  const createForm = useForm<CreateFormData>({
    resolver: zodResolver(createSchema),
    defaultValues: { name: '', code: '', description: '' },
  })

  const editForm = useForm<EditFormData>({
    resolver: zodResolver(editSchema),
    defaultValues: { name: '', code: '', description: '', isActive: true },
  })

  const documentTypes = data?.documentTypes ?? []

  const openEdit = (documentType: CatalogDocumentTypeRecord) => {
    setEditing(documentType)
    editForm.reset({
      name: documentType.name,
      code: documentType.code,
      description: documentType.description ?? '',
      isActive: documentType.isActive,
    })
  }

  const closeEdit = () => {
    setEditing(null)
    editForm.reset({ name: '', code: '', description: '', isActive: true })
  }

  const onCreate = async (form: CreateFormData) => {
    try {
      await createMutation.mutateAsync({
        name: form.name.trim(),
        code: form.code.trim(),
        description: form.description?.trim() || undefined,
      })
      toast.success('Document type added')
      createForm.reset()
      setShowCreate(false)
    } catch (err) {
      showApiError('Could not add document type', err)
    }
  }

  const onEdit = async (form: EditFormData) => {
    if (!editing) return

    try {
      await updateMutation.mutateAsync({
        id: editing.id,
        name: form.name.trim(),
        code: form.code.trim(),
        description: form.description?.trim() || null,
        isActive: form.isActive,
      })
      toast.success('Document type updated')
      closeEdit()
    } catch (err) {
      showApiError('Could not update document type', err)
    }
  }

  const handleDeactivate = async (documentType: CatalogDocumentTypeRecord) => {
    const confirmed = await confirm({
      title: 'Deactivate document type',
      description: `Deactivate "${documentType.name}"? It will no longer appear in document dropdowns.`,
      confirmLabel: 'Deactivate',
      variant: 'destructive',
    })

    if (!confirmed) return

    try {
      await deactivateMutation.mutateAsync(documentType.id)
      toast.success('Document type deactivated')
    } catch (err) {
      showApiError('Could not deactivate document type', err)
    }
  }

  return (
    <>
      <WidgetCard
        title="Document types"
        action={
          <Button size="sm" variant={showCreate ? 'outline' : 'default'} onClick={() => setShowCreate((v) => !v)}>
            <Plus className="h-4 w-4" aria-hidden />
            Add type
          </Button>
        }
      >
        {showCreate && (
          <form
            onSubmit={createForm.handleSubmit(onCreate)}
            className="mb-6 grid max-w-xl gap-4 rounded-lg border border-border p-4"
          >
            <div className="space-y-2">
              <Label htmlFor="type-name">Name</Label>
              <Input id="type-name" {...createForm.register('name')} />
              {createForm.formState.errors.name && (
                <p className="text-xs text-destructive">{createForm.formState.errors.name.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="type-code">Code</Label>
              <Input id="type-code" placeholder="MEMO" {...createForm.register('code')} />
              {createForm.formState.errors.code && (
                <p className="text-xs text-destructive">{createForm.formState.errors.code.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="type-desc">Description</Label>
              <Textarea id="type-desc" rows={2} {...createForm.register('description')} />
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? 'Saving…' : 'Save document type'}
              </Button>
              <Button type="button" variant="outline" onClick={() => setShowCreate(false)}>
                Cancel
              </Button>
            </div>
          </form>
        )}

        {isLoading ? (
          <Skeleton className="h-32 w-full" />
        ) : documentTypes.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-10 text-center text-muted-foreground">
            <FileType2 className="h-8 w-8 opacity-50" aria-hidden />
            <p>No document types yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead>
                <tr className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-2 py-2 font-medium">Name</th>
                  <th className="px-2 py-2 font-medium">Code</th>
                  <th className="px-2 py-2 font-medium">Status</th>
                  <th className="px-2 py-2 font-medium" />
                </tr>
              </thead>
              <tbody>
                {documentTypes.map((documentType) => (
                  <tr key={documentType.id} className="border-b border-border/60">
                    <td className="px-2 py-3">
                      <p className="font-medium">{documentType.name}</p>
                      {documentType.description && (
                        <p className="mt-0.5 text-xs text-muted-foreground">{documentType.description}</p>
                      )}
                    </td>
                    <td className="px-2 py-3 font-mono text-xs">{documentType.code}</td>
                    <td className="px-2 py-3">
                      <Badge variant={documentType.isActive ? 'default' : 'secondary'}>
                        {documentType.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                    <td className="px-2 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="sm" onClick={() => openEdit(documentType)}>
                          <Pencil className="h-4 w-4" aria-hidden />
                          Edit
                        </Button>
                        {documentType.isActive && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            disabled={deactivateMutation.isPending}
                            onClick={() => handleDeactivate(documentType)}
                          >
                            Deactivate
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
          if (!open) closeEdit()
        }}
        title="Edit document type"
        description="Update document type details or mark inactive."
        form={editForm}
        onSubmit={onEdit}
        submitLabel="Save changes"
        loading={updateMutation.isPending}
      >
        <div className="space-y-2">
          <Label htmlFor="edit-type-name">Name</Label>
          <Input id="edit-type-name" {...editForm.register('name')} />
          {editForm.formState.errors.name && (
            <p className="text-xs text-destructive">{editForm.formState.errors.name.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="edit-type-code">Code</Label>
          <Input id="edit-type-code" {...editForm.register('code')} />
          {editForm.formState.errors.code && (
            <p className="text-xs text-destructive">{editForm.formState.errors.code.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="edit-type-desc">Description</Label>
          <Textarea id="edit-type-desc" rows={2} {...editForm.register('description')} />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" {...editForm.register('isActive')} className="rounded border-border" />
          Active
        </label>
      </FormModal>
    </>
  )
}
