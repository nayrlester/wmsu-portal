import { cn } from '@/lib/utils'
import type { BorrowingStatus } from '@/types/borrowings'
import { BORROWING_STATUS_LABELS } from '@/types/borrowings'

const statusStyles: Record<BorrowingStatus, string> = {
  requested: 'bg-amber-50 text-amber-700 ring-amber-600/20',
  approved: 'bg-blue-50 text-blue-700 ring-blue-600/20',
  borrowed: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  returned: 'bg-slate-100 text-slate-600 ring-slate-500/20',
  overdue: 'bg-red-50 text-red-700 ring-red-600/20',
  lost: 'bg-purple-50 text-purple-700 ring-purple-600/20',
}

export function BorrowingStatusBadge({ status }: { status: BorrowingStatus }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset',
        statusStyles[status]
      )}
    >
      {BORROWING_STATUS_LABELS[status]}
    </span>
  )
}
