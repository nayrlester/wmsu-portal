import type { LucideIcon } from 'lucide-react'

export { DocumentStatusBadge as StatusBadge } from '@/components/desk-app/documents/document-status-badge'

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description?: string
  action?: React.ReactNode
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border/80 bg-muted/20 px-6 py-16 text-center">
      <Icon className="h-8 w-8 text-muted-foreground/50" aria-hidden />
      <h3 className="mt-4 text-base font-medium">{title}</h3>
      {description && <p className="mt-2 max-w-sm text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  )
}
