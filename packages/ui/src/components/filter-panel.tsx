import type { ReactNode } from 'react'
import { Filter } from 'lucide-react'
import { cn } from '../lib/utils'
import { Button } from './button'
import { Card, CardContent, CardHeader, CardTitle } from './card'

export type FilterPanelProps = {
  title?: string
  children: ReactNode
  onReset?: () => void
  onApply?: () => void
  className?: string
  actions?: ReactNode
}

export function FilterPanel({
  title = 'Filters',
  children,
  onReset,
  onApply,
  className,
  actions,
}: FilterPanelProps) {
  return (
    <Card className={cn(className)}>
      <CardHeader className="flex-row items-center justify-between gap-3 space-y-0">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Filter className="h-4 w-4 text-[var(--color-wmsu-navy)]" aria-hidden />
          {title}
        </CardTitle>
        <div className="flex items-center gap-2">
          {actions}
          {onReset ? (
            <Button type="button" variant="ghost" size="sm" onClick={onReset}>
              Reset
            </Button>
          ) : null}
          {onApply ? (
            <Button type="button" size="sm" onClick={onApply}>
              Apply
            </Button>
          ) : null}
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{children}</div>
      </CardContent>
    </Card>
  )
}
