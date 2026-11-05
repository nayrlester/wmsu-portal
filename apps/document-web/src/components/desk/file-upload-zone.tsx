import { useCallback, useState } from 'react'
import { Upload, File, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface FileUploadZoneProps {
  /** Append-only callback for immediate-upload flows. */
  onFiles?: (files: File[]) => void
  /** Controlled file list; pair with onFilesChange for deferred uploads. */
  files?: File[]
  onFilesChange?: (files: File[]) => void
  accept?: string
  multiple?: boolean
  disabled?: boolean
}

export function FileUploadZone({
  onFiles,
  files: controlledFiles,
  onFilesChange,
  accept,
  multiple = true,
  disabled,
}: FileUploadZoneProps) {
  const [dragging, setDragging] = useState(false)
  const [internalFiles, setInternalFiles] = useState<File[]>([])
  const isControlled = controlledFiles !== undefined && onFilesChange !== undefined
  const selected = isControlled ? controlledFiles : internalFiles

  const addFiles = useCallback(
    (incoming: File[]) => {
      const normalized = multiple ? incoming : incoming.slice(0, 1)
      if (normalized.length === 0) return

      // Immediate-upload mode: fire callback and do not keep a "staged" list
      // (that makes users look for a Submit button that belongs on the version card).
      const immediateOnly = Boolean(onFiles) && !isControlled

      if (isControlled) {
        onFilesChange(multiple ? [...controlledFiles, ...normalized] : normalized)
      } else if (!immediateOnly) {
        setInternalFiles((prev) => (multiple ? [...prev, ...normalized] : normalized))
      }
      onFiles?.(normalized)
    },
    [controlledFiles, isControlled, multiple, onFiles, onFilesChange]
  )

  const removeFile = useCallback(
    (index: number) => {
      if (isControlled) {
        onFilesChange(controlledFiles.filter((_, idx) => idx !== index))
      } else {
        setInternalFiles((prev) => prev.filter((_, idx) => idx !== index))
      }
    },
    [controlledFiles, isControlled, onFilesChange]
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragging(false)
      if (disabled) return
      addFiles([...e.dataTransfer.files])
    },
    [addFiles, disabled]
  )

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault()
        setDragging(true)
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      className={cn(
        'rounded-lg border-2 border-dashed transition-colors',
        selected.length > 0
          ? 'px-4 py-4'
          : 'flex flex-col items-center justify-center px-6 py-10',
        dragging ? 'border-primary bg-primary/5' : 'border-border bg-muted/20',
        disabled && 'opacity-50'
      )}
    >
      {selected.length > 0 ? (
        <ul className="w-full space-y-2">
          {selected.map((f, i) => (
            <li
              key={`${f.name}-${i}`}
              className="flex items-center gap-2 rounded-md border border-border/80 bg-background px-3 py-2 text-sm"
            >
              <File className="h-4 w-4 shrink-0 text-primary" />
              <span className="min-w-0 flex-1 truncate">{f.name}</span>
              <span className="shrink-0 text-xs text-muted-foreground">
                {(f.size / 1024).toFixed(1)} KB
              </span>
              <button
                type="button"
                aria-label={`Remove ${f.name}`}
                className="shrink-0 rounded-sm p-0.5 hover:bg-muted"
                onClick={() => removeFile(i)}
              >
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <>
          <Upload className="mb-3 h-10 w-10 text-muted-foreground" aria-hidden />
          <p className="text-sm font-medium">
            {multiple ? 'Drag & drop files here' : 'Drag & drop a file here'}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">or click to browse</p>
        </>
      )}

      {(multiple || selected.length === 0) && (
        <label className={cn('block', selected.length > 0 ? 'mt-3 text-center' : 'mt-4')}>
          <input
            type="file"
            className="sr-only"
            accept={accept}
            multiple={multiple}
            disabled={disabled}
            onChange={(e) => {
              addFiles([...(e.target.files ?? [])])
              e.target.value = ''
            }}
          />
          <span className="cursor-pointer rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
            {multiple && selected.length > 0 ? 'Add more files' : multiple ? 'Browse files' : 'Browse file'}
          </span>
        </label>
      )}

      {multiple && selected.length > 0 ? (
        <p className="mt-2 text-center text-xs text-muted-foreground">Drag & drop to add more files</p>
      ) : null}
    </div>
  )
}
