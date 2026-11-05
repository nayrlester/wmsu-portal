import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

export type VersionApprovalModalAction = 'approve' | 'return' | 'reject'

interface DocumentVersionApprovalModalProps {
  open: boolean
  action: VersionApprovalModalAction | null
  versionLabel: string
  pending: boolean
  onClose: () => void
  onConfirm: (comments: string) => void
}

const TITLES: Record<VersionApprovalModalAction, string> = {
  approve: 'Approve version',
  return: 'Return version',
  reject: 'Reject version',
}

const DESCRIPTIONS: Record<VersionApprovalModalAction, string> = {
  approve: 'Optional comments will be recorded in the activity log.',
  return: 'Add remarks explaining what needs to be revised.',
  reject: 'Explain why this version is being rejected. This will be recorded in the activity log.',
}

export function DocumentVersionApprovalModal({
  open,
  action,
  versionLabel,
  pending,
  onClose,
  onConfirm,
}: DocumentVersionApprovalModalProps) {
  const [comments, setComments] = useState('')

  useEffect(() => {
    if (open) setComments('')
  }, [open, action])

  if (!action) return null

  const trimmedComments = comments.trim()
  const requiresComments = action === 'reject'
  const canConfirm = requiresComments ? trimmedComments.length > 0 : true

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={TITLES[action]}
      className="max-w-lg"
      footer={
        <>
          <Button type="button" variant="outline" onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <Button
            type="button"
            variant={action === 'reject' ? 'destructive' : 'default'}
            onClick={() => onConfirm(trimmedComments)}
            disabled={pending || !canConfirm}
          >
            {action === 'approve' ? 'Confirm approval' : action === 'return' ? 'Confirm return' : 'Confirm rejection'}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">
          {versionLabel} · {DESCRIPTIONS[action]}
        </p>
        <div className="space-y-2">
          <Label htmlFor="version-approval-comments">
            {action === 'reject' ? 'Reason for rejection' : 'Comments'}
          </Label>
          <Textarea
            id="version-approval-comments"
            value={comments}
            onChange={(event) => setComments(event.target.value)}
            placeholder={
              action === 'reject'
                ? 'Enter the rejection reason…'
                : 'Add remarks for this action…'
            }
            rows={4}
            autoFocus
            aria-required={requiresComments}
          />
        </div>
      </div>
    </Dialog>
  )
}
