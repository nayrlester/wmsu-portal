import { useCallback, useState } from 'react'
import type { Control, FieldPath, FieldValues } from 'react-hook-form'
import { Controller } from 'react-hook-form'
import { Upload, File, X } from 'lucide-react'
import { Label } from '@/components/ui/label'
import { cn, formatBytes } from '@/lib/utils'

export interface FormFileUploadProps<T extends FieldValues> {
  name: FieldPath<T>
  control: Control<T>
  label: string
  accept?: string
  multiple?: boolean
  disabled?: boolean
  className?: string
}

export function FormFileUpload<T extends FieldValues>({
  name,
  control,
  label,
  accept,
  multiple = true,
  disabled,
  className,
}: FormFileUploadProps<T>) {
  const [dragging, setDragging] = useState(false)

  const mergeFiles = useCallback((current: File[] | File | undefined, incoming: File[]) => {
    const base = Array.isArray(current) ? current : current ? [current] : []
    return multiple ? [...base, ...incoming] : incoming.slice(0, 1)
  }, [multiple])

  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => {
        const files = Array.isArray(field.value) ? field.value : field.value ? [field.value as File] : []

        return (
          <div className={cn('space-y-3', className)}>
            <Label htmlFor={name}>{label}</Label>
            <div
              onDragOver={(event) => {
                event.preventDefault()
                setDragging(true)
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(event) => {
                event.preventDefault()
                setDragging(false)
                if (disabled) return
                field.onChange(mergeFiles(field.value, [...event.dataTransfer.files]))
              }}
              className={cn(
                'flex flex-col items-center justify-center rounded-lg border-2 border-dashed px-6 py-10 transition-colors',
                dragging ? 'border-primary bg-primary/5' : 'border-border bg-muted/20',
                disabled && 'opacity-50'
              )}
            >
              <Upload className="mb-3 h-10 w-10 text-muted-foreground" aria-hidden />
              <p className="text-sm font-medium">Drag & drop files here</p>
              <label className="mt-4">
                <input
                  id={name}
                  type="file"
                  className="sr-only"
                  accept={accept}
                  multiple={multiple}
                  disabled={disabled}
                  onChange={(event) => {
                    field.onChange(mergeFiles(field.value, [...(event.target.files ?? [])]))
                  }}
                />
                <span className="cursor-pointer rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
                  Browse files
                </span>
              </label>
            </div>

            {files.length > 0 && (
              <ul className="space-y-2">
                {files.map((file, index) => (
                  <li
                    key={`${file.name}-${index}`}
                    className="flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm"
                  >
                    <File className="h-4 w-4 text-primary" aria-hidden />
                    <span className="flex-1 truncate">{file.name}</span>
                    <span className="text-xs text-muted-foreground">{formatBytes(file.size)}</span>
                    <button
                      type="button"
                      aria-label={`Remove ${file.name}`}
                      onClick={() => {
                        const next = files.filter((_, fileIndex) => fileIndex !== index)
                        field.onChange(multiple ? next : next[0] ?? undefined)
                      }}
                    >
                      <X className="h-4 w-4 text-muted-foreground" />
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {fieldState.error && (
              <p className="text-xs text-destructive" role="alert">
                {fieldState.error.message}
              </p>
            )}
          </div>
        )
      }}
    />
  )
}
