import type { ReactNode } from 'react'
import { Filter } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface TableFilterField {
  id: string
  label?: string
  element: ReactNode
}

export interface TableFiltersProps {
  fields?: TableFilterField[]
  children?: ReactNode
  summary?: ReactNode
  className?: string
}

export function TableFilters({ fields, children, summary, className }: TableFiltersProps) {
  return (
    <div className={cn('desk-card flex flex-col gap-3 p-4 sm:flex-row sm:items-center', className)}>
      {(fields?.length || children) && (
        <div className="flex flex-1 flex-wrap items-center gap-3">
          <Filter className="hidden h-4 w-4 text-muted-foreground sm:block" aria-hidden />
          {fields?.map((field) => (
            <div key={field.id} className="min-w-[140px] flex-1 sm:max-w-xs">
              {field.element}
            </div>
          ))}
          {children}
        </div>
      )}
      {summary && <div className="text-sm text-muted-foreground sm:ml-auto">{summary}</div>}
    </div>
  )
}
