import {
  Activity,
  BarChart3,
  ExternalLink,
  FileText,
  GitBranch,
  Search,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import type { CopilotCard } from '@/features/copilot/types/copilot.types'

interface AIActionCardProps {
  card: CopilotCard
  compact?: boolean
}

function CardIcon({ type }: { type: CopilotCard['type'] }) {
  const className = 'h-4 w-4 shrink-0 text-muted-foreground'
  switch (type) {
    case 'analytics':
      return <BarChart3 className={className} />
    case 'workflow':
      return <GitBranch className={className} />
    case 'activity':
      return <Activity className={className} />
    case 'search_result':
      return <Search className={className} />
    default:
      return <FileText className={className} />
  }
}

export function AIActionCard({ card, compact }: AIActionCardProps) {
  const navigate = useNavigate()
  const status = card.metadata?.status as string | undefined

  const handleClick = () => {
    if (card.href) navigate(card.href)
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={!card.href}
      className={cn(
        'group flex w-full items-start gap-3 rounded-lg border border-border/70 bg-background p-3 text-left transition-premium',
        card.href && 'hover:border-border hover:bg-muted/30 cursor-pointer',
        !card.href && 'cursor-default',
        compact && 'p-2.5'
      )}
    >
      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted/60">
        <CardIcon type={card.type} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className="truncate text-sm font-medium text-foreground">{card.title}</p>
          {card.href && (
            <ExternalLink className="h-3.5 w-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
          )}
        </div>
        {card.subtitle && (
          <p className="mt-0.5 truncate text-xs text-muted-foreground">{card.subtitle}</p>
        )}
        {card.description && (
          <p className={cn('mt-1 text-xs text-muted-foreground', card.type === 'analytics' && 'text-lg font-semibold text-foreground')}>
            {card.description}
          </p>
        )}
        {status && (
          <Badge variant="secondary" className="mt-2 capitalize">
            {status.replace(/_/g, ' ')}
          </Badge>
        )}
      </div>
    </button>
  )
}
