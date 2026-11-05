import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'

export interface MetricTileProps {
  label: string
  value: string | number
  trend?: { value: string; positive?: boolean }
  icon?: LucideIcon
  loading?: boolean
  className?: string
}

/** Linear-style metric tile — minimal border, no heavy decoration */
export function MetricTile({ label, value, trend, icon: Icon, loading, className }: MetricTileProps) {
  return (
    <div
      className={cn(
        'surface-card flex flex-col gap-3 p-4 transition-premium hover:border-border sm:p-5',
        className
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-caption font-medium">{label}</p>
        {Icon && <Icon className="h-4 w-4 text-muted-foreground/60" aria-hidden />}
      </div>
      {loading ? (
        <Skeleton className="h-8 w-20" />
      ) : (
        <p className="text-2xl font-semibold tabular-nums tracking-tight">{value}</p>
      )}
      {trend && !loading && (
        <p
          className={cn(
            'text-xs font-medium',
            trend.positive ? 'text-[var(--color-success)]' : 'text-muted-foreground'
          )}
        >
          {trend.value}
        </p>
      )}
    </div>
  )
}
