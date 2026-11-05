import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Check, X, History } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { LibraryCard } from '@/components/members/library-card'
import { MembershipStatusBadge } from '@/components/members/membership-status-badge'
import { MemberFormModal } from '@/features/members/components/member-form-modal'
import {
  useMember,
  useMemberCard,
  useApproveMember,
  useRejectMember,
} from '@/hooks/use-members'
import { useMembersStore } from '@/stores/members-store'
import { useAuthStore } from '@/stores/auth-store'
import { MEMBER_TYPE_LABELS } from '@/types/members'

export function MemberDetailPage() {
  const { id = '' } = useParams()
  const { data: member, isLoading, isError } = useMember(id)
  const { data: card } = useMemberCard(id, member?.membershipStatus === 'approved')
  const { openEditForm } = useMembersStore()
  const user = useAuthStore((s) => s.user)

  const approve = useApproveMember()
  const reject = useRejectMember()

  const canUpdate = user?.permissions.includes('members:update')
  const canApprove = user?.permissions.includes('members:approve')

  if (isLoading) {
    return <div className="py-16 text-center text-sm text-slate-500">Loading profile...</div>
  }

  if (isError || !member) {
    return (
      <div className="py-16 text-center">
        <p className="text-red-600">Member not found</p>
        <Link to="/members" className="mt-2 inline-block text-sm text-blue-600">
          Back to members
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          to="/members"
          className="mb-3 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to members
        </Link>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold tracking-tight">{member.fullName}</h1>
              <MembershipStatusBadge status={member.membershipStatus} />
            </div>
            <p className="mt-1 text-sm text-slate-500">
              {MEMBER_TYPE_LABELS[member.memberType]}
              {member.department && ` · ${member.department}`}
            </p>
            <p className="font-mono text-sm text-slate-600">{member.libraryCardNumber}</p>
          </div>

          <div className="flex gap-2">
            {canUpdate && (
              <Button variant="outline" onClick={() => openEditForm(member)}>
                Edit profile
              </Button>
            )}
            {canApprove && member.membershipStatus === 'pending' && (
              <>
                <Button onClick={() => approve.mutate(member.id)} disabled={approve.isPending}>
                  <Check className="mr-1 h-4 w-4" />
                  Approve
                </Button>
                <Button
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
              </>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Profile</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2 text-sm">
              <Field label="Email" value={member.email} />
              <Field label="Contact" value={member.contact} />
              <Field label="Department" value={member.department} />
              <Field label="Member type" value={MEMBER_TYPE_LABELS[member.memberType]} />
              <Field label="Registered" value={new Date(member.createdAt).toLocaleDateString()} />
              {member.approvedAt && (
                <Field
                  label="Approved"
                  value={new Date(member.approvedAt).toLocaleDateString()}
                />
              )}
              {member.rejectionReason && (
                <div className="sm:col-span-2">
                  <p className="text-xs font-medium text-red-500">Rejection reason</p>
                  <p className="mt-0.5 text-sm text-slate-700">{member.rejectionReason}</p>
                </div>
              )}
              {member.notes && (
                <div className="sm:col-span-2">
                  <p className="text-xs font-medium text-slate-500">Notes</p>
                  <p className="mt-0.5 text-sm text-slate-700">{member.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <History className="h-4 w-4" />
                Borrowing history
              </CardTitle>
            </CardHeader>
            <CardContent>
              {member.borrowingHistory.placeholder ? (
                <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-6 text-center">
                  <p className="text-sm text-slate-600">{member.borrowingHistory.message}</p>
                  <p className="mt-1 text-xs text-slate-400">Phase 4 — Circulation module</p>
                </div>
              ) : (
                <ul className="space-y-2">
                  {member.borrowingHistory.items.map((item) => (
                    <li key={item.id} className="rounded-lg border border-slate-100 p-3 text-sm">
                      {item.bookTitle ?? 'Unknown book'} — {item.status}
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>

        <div>
          {member.membershipStatus === 'approved' && card ? (
            <LibraryCard card={card} />
          ) : (
            <Card>
              <CardContent className="py-8 text-center text-sm text-slate-500">
                Library card with QR code is available after membership approval.
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <MemberFormModal />
    </div>
  )
}

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className="mt-0.5 text-sm text-slate-800">{value ?? '—'}</p>
    </div>
  )
}
