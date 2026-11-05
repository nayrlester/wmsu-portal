import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { DocumentStatusBadge } from '@/components/desk-app/documents/document-status-badge'
import { formatDate } from '@/lib/utils'
import { cn } from '@/lib/utils'

export interface DocumentCardProps {
  id: string
  title: string
  trackingNumber: string
  status: string
  createdAt: string
  href?: string
  className?: string
}

export function DocumentCard({
  title,
  trackingNumber,
  status,
  createdAt,
  href,
  className,
}: DocumentCardProps) {
  const content = (
    <>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{title}</p>
          <p className="mt-1 font-mono text-caption">{trackingNumber}</p>
        </div>
        <DocumentStatusBadge status={status} />
      </div>
      <div className="mt-3 flex items-center justify-between text-caption">
        <span>{formatDate(createdAt)}</span>
        {href && <ChevronRight className="h-4 w-4 text-muted-foreground/50" aria-hidden />}
      </div>
    </>
  )

  const classes = cn(
    'surface-card block p-4 transition-premium hover:border-foreground/10 sm:p-5',
    href && 'hover-lift',
    className
  )

  if (href) {
    return (
      <Link to={href} className={classes}>
        {content}
      </Link>
    )
  }

  return <article className={classes}>{content}</article>
}
