import { cn } from '@/lib/utils'
import type { MembershipStatus } from '@/types/members'
import { MEMBERSHIP_STATUS_LABELS } from '@/types/members'

const statusStyles: Record<MembershipStatus, string> = {
  pending: 'bg-amber-50 text-amber-700 border-amber-200',
  approved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  rejected: 'bg-red-50 text-red-700 border-red-200',
  suspended: 'bg-slate-100 text-slate-600 border-slate-200',
  expired: 'bg-slate-50 text-slate-400 border-slate-200',
}

export function MembershipStatusBadge({
  status,
  className,
}: {
  status: MembershipStatus
  className?: string
}) {
  return (
    <span
      className={cn(
        'inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium',
        statusStyles[status],
        className
      )}
    >
      {MEMBERSHIP_STATUS_LABELS[status]}
    </span>
  )
}
