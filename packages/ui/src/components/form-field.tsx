import type { ReactNode } from 'react'
import { cn } from '../lib/utils'
import { Label } from './label'

export type FormFieldProps = {
  id: string
  label: string
  description?: string
  error?: string
  required?: boolean
  className?: string
  children: ReactNode
}

export function FormField({ id, label, description, error, required, className, children }: FormFieldProps) {
  const describedBy = [description ? `${id}-desc` : null, error ? `${id}-error` : null]
    .filter(Boolean)
    .join(' ')

  return (
    <div className={cn('space-y-2', className)}>
      <Label htmlFor={id}>
        {label}
        {required ? <span className="ml-1 text-[var(--color-destructive)]">*</span> : null}
      </Label>
      <div>{children}</div>
      {description ? (
        <p id={`${id}-desc`} className="text-xs text-[var(--color-muted-foreground)]">
          {description}
        </p>
      ) : null}
      {error ? (
        <p id={`${id}-error`} role="alert" className="text-xs font-medium text-[var(--color-destructive)]">
          {error}
        </p>
      ) : null}
      {describedBy ? <span className="sr-only" aria-hidden={!describedBy} /> : null}
    </div>
  )
}
