import { cn, statusColor } from '@/lib/utils'

export interface DocumentStatusBadgeProps {
  status: string
  className?: string
}

export function DocumentStatusBadge({ status, className }: DocumentStatusBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium capitalize',
        statusColor(status),
        className
      )}
    >
      {status.replace(/_/g, ' ')}
    </span>
  )
}
