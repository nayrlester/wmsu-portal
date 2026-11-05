import { Check, RotateCcw, X } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface DocumentVersionApprovalActionsProps {
  pending: boolean
  approveDisabled?: boolean
  approveDisabledReason?: string | null
  onApprove: () => void
  onReturn: () => void
  onReject: () => void
}

export function DocumentVersionApprovalActions({
  pending,
  approveDisabled = false,
  approveDisabledReason = null,
  onApprove,
  onReturn,
  onReject,
}: DocumentVersionApprovalActionsProps) {
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          onClick={onApprove}
          disabled={pending || approveDisabled}
          title={approveDisabled ? (approveDisabledReason ?? undefined) : undefined}
        >
          <Check className="h-3.5 w-3.5" aria-hidden />
          Approve
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={onReturn} disabled={pending}>
          <RotateCcw className="h-3.5 w-3.5" aria-hidden />
          Return
        </Button>
        <Button type="button" size="sm" variant="destructive" onClick={onReject} disabled={pending}>
          <X className="h-3.5 w-3.5" aria-hidden />
          Reject
        </Button>
      </div>
      {approveDisabled && approveDisabledReason && (
        <p className="text-xs text-amber-700 dark:text-amber-400" role="status">
          {approveDisabledReason}
        </p>
      )}
    </div>
  )
}
