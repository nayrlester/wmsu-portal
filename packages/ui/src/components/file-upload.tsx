import { FileUp, Trash2 } from 'lucide-react'
import { useId, useRef, useState, type ChangeEvent, type DragEvent } from 'react'
import { cn } from '../lib/utils'
import { Button } from './button'

export type FileUploadProps = {
  label?: string
  hint?: string
  accept?: string
  multiple?: boolean
  disabled?: boolean
  files?: File[]
  onChange?: (files: File[]) => void
  className?: string
  error?: string
}

export function FileUpload({
  label = 'Upload files',
  hint = 'PDF, images, or Office documents up to campus policy limits',
  accept,
  multiple,
  disabled,
  files,
  onChange,
  className,
  error,
}: FileUploadProps) {
  const inputId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const [internal, setInternal] = useState<File[]>([])
  const [dragging, setDragging] = useState(false)
  const selected = files ?? internal

  function commit(next: File[]) {
    setInternal(next)
    onChange?.(next)
  }

  function handleFiles(list: FileList | null) {
    if (!list) return
    const next = multiple ? [...selected, ...Array.from(list)] : Array.from(list).slice(0, 1)
    commit(next)
  }

  function onDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault()
    setDragging(false)
    if (disabled) return
    handleFiles(event.dataTransfer.files)
  }

  function onInputChange(event: ChangeEvent<HTMLInputElement>) {
    handleFiles(event.target.files)
    event.target.value = ''
  }

  return (
    <div className={cn('space-y-3', className)}>
      <label
        htmlFor={inputId}
        onDragOver={(event) => {
          event.preventDefault()
          if (!disabled) setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={cn(
          'flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border border-dashed px-4 py-8 text-center transition-colors',
          dragging ? 'border-[var(--color-primary)] bg-[var(--color-primary-soft)]' : 'border-[var(--color-border)] bg-white',
          disabled && 'cursor-not-allowed opacity-60',
          error && 'border-[var(--color-destructive)]'
        )}
      >
        <FileUp className="h-6 w-6 text-[var(--color-wmsu-navy)]" aria-hidden />
        <div>
          <p className="text-sm font-semibold text-[var(--color-ink)]">{label}</p>
          <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">{hint}</p>
        </div>
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          className="sr-only"
          accept={accept}
          multiple={multiple}
          disabled={disabled}
          onChange={onInputChange}
        />
      </label>
      {error ? (
        <p role="alert" className="text-xs font-medium text-[var(--color-destructive)]">
          {error}
        </p>
      ) : null}
      {selected.length > 0 ? (
        <ul className="space-y-2">
          {selected.map((file, index) => (
            <li
              key={`${file.name}-${index}`}
              className="flex items-center justify-between gap-3 rounded-xl border border-[var(--color-border)] bg-white px-3 py-2 text-sm"
            >
              <span className="truncate">{file.name}</span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={`Remove ${file.name}`}
                onClick={() => commit(selected.filter((_, i) => i !== index))}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
