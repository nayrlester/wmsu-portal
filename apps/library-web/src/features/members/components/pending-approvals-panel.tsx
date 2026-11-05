import { Check, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { MembershipStatusBadge } from '@/components/members/membership-status-badge'
import { usePendingMembers, useApproveMember, useRejectMember } from '@/hooks/use-members'
import { MEMBER_TYPE_LABELS } from '@/types/members'
import { Link } from 'react-router-dom'

export function PendingApprovalsPanel() {
  const { data, isLoading } = usePendingMembers()
  const approve = useApproveMember()
  const reject = useRejectMember()

  if (isLoading) return null
  if (!data?.count) return null

  return (
    <Card className="border-amber-200 bg-amber-50/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-base text-amber-900">
          Pending approvals ({data.count})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {data.members.map((member) => (
          <div
            key={member.id}
            className="flex flex-col gap-3 rounded-lg border border-amber-100 bg-white p-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              <Link
                to={`/members/${member.id}`}
                className="font-medium text-slate-900 hover:text-blue-600"
              >
                {member.fullName}
              </Link>
              <p className="text-sm text-slate-500">
                {MEMBER_TYPE_LABELS[member.memberType]}
                {member.department && ` · ${member.department}`}
              </p>
              <p className="text-xs text-slate-400">{member.email ?? member.contact ?? '—'}</p>
            </div>
            <div className="flex items-center gap-2">
              <MembershipStatusBadge status={member.membershipStatus} />
              <Button
                size="sm"
                onClick={() => approve.mutate(member.id)}
                disabled={approve.isPending}
              >
                <Check className="mr-1 h-4 w-4" />
                Approve
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  const reason = prompt('Rejection reason (optional):')
                  reject.mutate({ id: member.id, reason: reason ?? undefined })
                }}
                disabled={reject.isPending}
              >
                <X className="mr-1 h-4 w-4" />
                Reject
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
