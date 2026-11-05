import { MoreHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { RowAction } from './types'

interface TableRowActionsProps {
  actions: RowAction[]
}

export function TableRowActions({ actions }: TableRowActionsProps) {
  if (!actions.length) return null

  if (actions.length === 1) {
    const [action] = actions
    return (
      <Button
        size="sm"
        variant={action.variant ?? 'outline'}
        onClick={(event) => {
          event.stopPropagation()
          action.onClick()
        }}
      >
        {action.icon}
        {action.label}
      </Button>
    )
  }

  return (
    <div className="flex justify-end gap-1">
      {actions.slice(0, 2).map((action) => (
        <Button
          key={action.id}
          size="sm"
          variant={action.variant ?? 'ghost'}
          onClick={(event) => {
            event.stopPropagation()
            action.onClick()
          }}
        >
          {action.icon}
          <span className="sr-only sm:not-sr-only">{action.label}</span>
        </Button>
      ))}
      {actions.length > 2 && (
        <Button size="sm" variant="ghost" aria-label="More actions">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      )}
    </div>
  )
}
