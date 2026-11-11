import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export function LabeledSearchField(props: {
  label: string
  error?: string
  children: ReactNode
  className?: string
}) {
  return (
    <div className={cn('space-y-1.5', props.className)}>
      <label className="text-sm font-medium text-[var(--color-ink)]">{props.label}</label>
      {props.children}
      {props.error ? <p className="text-xs text-red-600">{props.error}</p> : null}
    </div>
  )
}
