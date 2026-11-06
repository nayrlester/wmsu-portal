import { cn } from '@/lib/utils'
import type { BookCopyStatus } from '@/types/books'

const statusConfig: Record<
  BookCopyStatus,
  { label: string; className: string; dotClass: string }
> = {
  available: {
    label: 'Available',
    className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    dotClass: 'bg-emerald-500',
  },
  on_loan: {
    label: 'Borrowed',
    className: 'bg-amber-50 text-amber-700 border-amber-200',
    dotClass: 'bg-amber-500',
  },
  reserved: {
    label: 'Reserved',
    className: 'bg-blue-50 text-blue-700 border-blue-200',
    dotClass: 'bg-blue-500',
  },
  maintenance: {
    label: 'Maintenance',
    className: 'bg-slate-100 text-slate-600 border-slate-200',
    dotClass: 'bg-slate-400',
  },
  damaged: {
    label: 'Damaged',
    className: 'bg-orange-50 text-orange-800 border-orange-200',
    dotClass: 'bg-orange-500',
  },
  under_repair: {
    label: 'Under repair',
    className: 'bg-violet-50 text-violet-800 border-violet-200',
    dotClass: 'bg-violet-500',
  },
  lost: {
    label: 'Lost',
    className: 'bg-red-50 text-red-700 border-red-200',
    dotClass: 'bg-red-500',
  },
  withdrawn: {
    label: 'Withdrawn',
    className: 'bg-slate-50 text-slate-400 border-slate-200',
    dotClass: 'bg-slate-300',
  },
}

export function InventoryBadge({
  status,
  className,
}: {
  status: BookCopyStatus
  className?: string
}) {
  const config = statusConfig[status]
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium',
        config.className,
        className
      )}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full', config.dotClass)} />
      {config.label}
    </span>
  )
}

export function InventorySummary({
  available,
  total,
  onLoan,
}: {
  available: number
  total: number
  onLoan?: number
}) {
  const pct = total > 0 ? Math.round((available / total) * 100) : 0
  const tone =
    pct >= 50 ? 'bg-emerald-500' : pct >= 20 ? 'bg-amber-500' : total > 0 ? 'bg-red-500' : 'bg-slate-300'

  return (
    <div className="flex items-center gap-3">
      <div className="flex-1">
        <div className="mb-1 flex justify-between text-xs text-slate-500">
          <span>
            {available} / {total} available
          </span>
          {onLoan !== undefined && onLoan > 0 && <span>{onLoan} borrowed</span>}
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
          <div className={cn('h-full rounded-full transition-all', tone)} style={{ width: `${pct}%` }} />
        </div>
      </div>
    </div>
  )
}
