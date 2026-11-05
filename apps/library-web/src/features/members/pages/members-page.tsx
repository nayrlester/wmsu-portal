import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Plus,
  Search,
  UserCircle,
  Pencil,
  Trash2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { MembershipStatusBadge } from '@/components/members/membership-status-badge'
import { MemberFormModal } from '@/features/members/components/member-form-modal'
import { PendingApprovalsPanel } from '@/features/members/components/pending-approvals-panel'
import { useDialog } from '@/components/providers/dialog-provider'
import { useMembers, useDeleteMember } from '@/hooks/use-members'
import { useMembersStore } from '@/stores/members-store'
import { useAuthStore } from '@/stores/auth-store'
import { MEMBER_TYPE_LABELS, type MembershipStatus, type MemberType } from '@/types/members'

export function MembersPage() {
  const {
    search,
    page,
    perPage,
    statusFilter,
    typeFilter,
    setSearch,
    setPage,
    setStatusFilter,
    setTypeFilter,
    openCreateForm,
    openEditForm,
  } = useMembersStore()

  const user = useAuthStore((s) => s.user)
  const { confirm, toast } = useDialog()
  const [localSearch, setLocalSearch] = useState(search)

  const canCreate = user?.permissions.includes('members:create')
  const canUpdate = user?.permissions.includes('members:update')
  const canDelete = user?.permissions.includes('members:delete')
  const canApprove = user?.permissions.includes('members:approve')

  const { data, isLoading, isError } = useMembers({
    search,
    page,
    perPage,
    membershipStatus: statusFilter === 'all' ? undefined : statusFilter,
    memberType: typeFilter === 'all' ? undefined : typeFilter,
  })

  const deleteMember = useDeleteMember()

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    setSearch(localSearch)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Members</h1>
          <p className="text-sm text-slate-500">Library membership and card management</p>
        </div>
        {canCreate && (
          <Button onClick={openCreateForm}>
            <Plus className="mr-2 h-4 w-4" />
            Register member
          </Button>
        )}
      </div>

      {canApprove && <PendingApprovalsPanel />}

      <div className="flex flex-col gap-3 sm:flex-row">
        <form onSubmit={handleSearch} className="flex flex-1 gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Search name, email, card number..."
              className="pl-10"
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
            />
          </div>
          <Button type="submit" variant="outline">
            Search
          </Button>
        </form>

        <div className="flex gap-2">
          <select
            className="h-10 rounded-lg border border-[var(--color-border)] bg-white px-3 text-sm"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as MembershipStatus | 'all')}
          >
            <option value="all">All statuses</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="suspended">Suspended</option>
            <option value="expired">Expired</option>
          </select>
          <select
            className="h-10 rounded-lg border border-[var(--color-border)] bg-white px-3 text-sm"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as MemberType | 'all')}
          >
            <option value="all">All types</option>
            {(Object.keys(MEMBER_TYPE_LABELS) as MemberType[]).map((t) => (
              <option key={t} value={t}>
                {MEMBER_TYPE_LABELS[t]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="py-16 text-center text-sm text-slate-500">Loading members...</div>
          ) : isError ? (
            <div className="py-16 text-center text-sm text-red-600">Failed to load members</div>
          ) : !data?.members.length ? (
            <div className="flex flex-col items-center py-16">
              <UserCircle className="mb-3 h-10 w-10 text-slate-300" />
              <p className="font-medium text-slate-700">No members found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/80 text-left">
                    <th className="px-4 py-3 font-medium text-slate-600">Name</th>
                    <th className="px-4 py-3 font-medium text-slate-600">Type</th>
                    <th className="px-4 py-3 font-medium text-slate-600">Department</th>
                    <th className="px-4 py-3 font-medium text-slate-600">Card #</th>
                    <th className="px-4 py-3 font-medium text-slate-600">Contact</th>
                    <th className="px-4 py-3 font-medium text-slate-600">Status</th>
                    <th className="px-4 py-3 font-medium text-slate-600" />
                  </tr>
                </thead>
                <tbody>
                  {data.members.map((member) => (
                    <tr
                      key={member.id}
                      className="border-b border-slate-50 hover:bg-slate-50/50"
                    >
                      <td className="px-4 py-3">
                        <Link
                          to={`/members/${member.id}`}
                          className="font-medium text-slate-900 hover:text-blue-600"
                        >
                          {member.fullName}
                        </Link>
                        {member.email && (
                          <p className="text-xs text-slate-400">{member.email}</p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {MEMBER_TYPE_LABELS[member.memberType]}
                      </td>
                      <td className="px-4 py-3 text-slate-600">{member.department ?? '—'}</td>
                      <td className="px-4 py-3 font-mono text-xs">{member.libraryCardNumber}</td>
                      <td className="px-4 py-3 text-slate-600">{member.contact ?? '—'}</td>
                      <td className="px-4 py-3">
                        <MembershipStatusBadge status={member.membershipStatus} />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1">
                          {canUpdate && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEditForm(member)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          )}
                          {canDelete && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={async () => {
                                const approved = await confirm({
                                  title: 'Remove member',
                                  message: `Remove ${member.fullName}?`,
                                  confirmLabel: 'Remove',
                                  tone: 'danger',
                                })
                                if (!approved) return
                                await deleteMember.mutateAsync(member.id)
                                toast.success('Member removed')
                              }}
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {data?.meta && data.meta.totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-slate-600">
          <span>
            Page {data.meta.page} of {data.meta.totalPages} ({data.meta.total} members)
          </span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= data.meta.totalPages}
              onClick={() => setPage(page + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      <MemberFormModal />
    </div>
  )
}
