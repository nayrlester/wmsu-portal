import type { ReactNode } from 'react'
import type { FieldValues, UseFormReturn } from 'react-hook-form'
import { Dialog } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

export interface FormModalProps<T extends FieldValues> {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  form: UseFormReturn<T>
  onSubmit: (values: T) => void | Promise<void>
  submitLabel?: string
  cancelLabel?: string
  loading?: boolean
  children: ReactNode
}

export function FormModal<T extends FieldValues>({
  open,
  onOpenChange,
  title,
  description,
  form,
  onSubmit,
  submitLabel = 'Save',
  cancelLabel = 'Cancel',
  loading,
  children,
}: FormModalProps<T>) {
  const {
    handleSubmit,
    formState: { isSubmitting },
  } = form

  return (
    <Dialog
      open={open}
      onClose={() => onOpenChange(false)}
      title={title}
      footer={
        <>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {cancelLabel}
          </Button>
          <Button
            type="submit"
            form="desk-app-form-modal"
            disabled={loading || isSubmitting}
          >
            {loading || isSubmitting ? 'Saving…' : submitLabel}
          </Button>
        </>
      }
    >
      {description && <p className="mb-4 text-sm text-muted-foreground">{description}</p>}
      <form id="desk-app-form-modal" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {children}
      </form>
    </Dialog>
  )
}
