import { useState } from 'react'
import { Plus, Users, Pencil, ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { useDialog } from '@/components/providers/dialog-provider'
import { getApiErrorMessage } from '@/lib/api-client'
import { useAuthStore } from '@/stores/auth-store'
import { useInviteUser, useUpdateUser, useUsers } from '@/hooks/use-users'
import type { StaffUser, UserRoleCode, UserStatus } from '@/types/users'
import { RowsPerPageSelect } from '@/components/rows-per-page'

const ROLE_OPTIONS: UserRoleCode[] = ['admin', 'librarian', 'staff', 'member']
const STATUS_OPTIONS: UserStatus[] = ['invited', 'active', 'suspended', 'deactivated']

function statusClass(status: string) {
  if (status === 'active') return 'bg-emerald-50 text-emerald-700'
  if (status === 'invited') return 'bg-[var(--color-primary-soft)] text-[var(--color-primary)]'
  if (status === 'suspended') return 'bg-amber-50 text-amber-800'
  return 'bg-slate-100 text-slate-600'
}

export function UsersPage() {
  const user = useAuthStore((s) => s.user)
  const { toast } = useDialog()
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(25)
  const [showInvite, setShowInvite] = useState(false)
  const [editing, setEditing] = useState<StaffUser | null>(null)
  const [invite, setInvite] = useState({
    email: '',
    fullName: '',
    roleCode: 'staff' as UserRoleCode,
    password: '',
  })
  const [editForm, setEditForm] = useState({
    fullName: '',
    status: 'active' as UserStatus,
    roleCode: 'staff' as UserRoleCode,
  })

  const canCreate = user?.permissions.includes('users:create')
  const canUpdate = user?.permissions.includes('users:update')

  const { data, isLoading, isError } = useUsers({ page, perPage })
  const inviteMutation = useInviteUser()
  const updateMutation = useUpdateUser()

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    try {
      await inviteMutation.mutateAsync({
        email: invite.email.trim(),
        fullName: invite.fullName.trim(),
        roleCode: invite.roleCode,
        password: invite.password.trim() || undefined,
      })
      toast.success('User invited')
      setShowInvite(false)
      setInvite({ email: '', fullName: '', roleCode: 'staff', password: '' })
    } catch (err) {
      toast.error(getApiErrorMessage(err))
    }
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault()
    if (!editing) return
    try {
      await updateMutation.mutateAsync({
        id: editing.id,
        payload: {
          fullName: editForm.fullName.trim(),
          status: editForm.status,
          roleCode: editForm.roleCode,
        },
      })
      toast.success('User updated')
      setEditing(null)
    } catch (err) {
      toast.error(getApiErrorMessage(err))
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Staff users</h1>
          <p className="text-sm text-slate-500">
            Local LMS accounts. SSO users sign in via University Platform Access, not this password
            list.
          </p>
        </div>
        {canCreate && (
          <Button onClick={() => setShowInvite(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Invite user
          </Button>
        )}
      </div>

      {showInvite && (
        <Card>
          <CardContent className="space-y-3 p-5">
            <p className="font-medium">Invite user</p>
            <form onSubmit={handleInvite} className="grid gap-3 sm:grid-cols-2">
              <Input
                placeholder="Full name"
                value={invite.fullName}
                onChange={(e) => setInvite((s) => ({ ...s, fullName: e.target.value }))}
                required
              />
              <Input
                type="email"
                placeholder="Email"
                value={invite.email}
                onChange={(e) => setInvite((s) => ({ ...s, email: e.target.value }))}
                required
              />
              <select
                className="h-11 rounded-full border-0 bg-[var(--color-primary-soft)] px-4 text-sm"
                value={invite.roleCode}
                onChange={(e) =>
                  setInvite((s) => ({ ...s, roleCode: e.target.value as UserRoleCode }))
                }
              >
                {ROLE_OPTIONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
              <Input
                type="password"
                placeholder="Password (optional — invited if empty)"
                value={invite.password}
                onChange={(e) => setInvite((s) => ({ ...s, password: e.target.value }))}
              />
              <div className="flex gap-2 sm:col-span-2">
                <Button type="button" variant="outline" onClick={() => setShowInvite(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={inviteMutation.isPending}>
                  Send invite
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {editing && (
        <Card>
          <CardContent className="space-y-3 p-5">
            <p className="font-medium">Edit {editing.email}</p>
            <form onSubmit={handleUpdate} className="grid gap-3 sm:grid-cols-3">
              <Input
                value={editForm.fullName}
                onChange={(e) => setEditForm((s) => ({ ...s, fullName: e.target.value }))}
                required
              />
              <select
                className="h-11 rounded-full border-0 bg-[var(--color-primary-soft)] px-4 text-sm"
                value={editForm.roleCode}
                onChange={(e) =>
                  setEditForm((s) => ({ ...s, roleCode: e.target.value as UserRoleCode }))
                }
              >
                {ROLE_OPTIONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
              <select
                className="h-11 rounded-full border-0 bg-[var(--color-primary-soft)] px-4 text-sm"
                value={editForm.status}
                onChange={(e) =>
                  setEditForm((s) => ({ ...s, status: e.target.value as UserStatus }))
                }
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              <div className="flex gap-2 sm:col-span-3">
                <Button type="button" variant="outline" onClick={() => setEditing(null)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={updateMutation.isPending}>
                  Save
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="py-16 text-center text-sm text-slate-500">Loading users…</div>
          ) : isError ? (
            <div className="py-16 text-center text-sm text-red-600">Failed to load users</div>
          ) : !data?.users.length ? (
            <div className="flex flex-col items-center py-16">
              <Users className="mb-3 h-10 w-10 text-slate-300" />
              <p className="font-medium text-slate-700">No users found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/80 text-left">
                    <th className="px-4 py-3 font-medium text-slate-600">Name</th>
                    <th className="px-4 py-3 font-medium text-slate-600">Email</th>
                    <th className="px-4 py-3 font-medium text-slate-600">Role</th>
                    <th className="px-4 py-3 font-medium text-slate-600">Source</th>
                    <th className="px-4 py-3 font-medium text-slate-600">Status</th>
                    <th className="px-4 py-3 font-medium text-slate-600" />
                  </tr>
                </thead>
                <tbody>
                  {data.users.map((u) => (
                    <tr key={u.id} className="border-b border-slate-50">
                      <td className="px-4 py-3 font-medium">{u.fullName}</td>
                      <td className="px-4 py-3 text-slate-600">{u.email}</td>
                      <td className="px-4 py-3">{u.roles?.[0] ?? '—'}</td>
                      <td className="px-4 py-3">
                        {u.isSystemAccount ? (
                          <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
                            System
                          </span>
                        ) : u.platformUserId ? (
                          <span className="inline-flex rounded-full bg-[var(--color-primary-soft)] px-2.5 py-0.5 text-xs font-medium text-[var(--color-primary)]">
                            SSO
                          </span>
                        ) : (
                          <span className="inline-flex rounded-full bg-slate-50 px-2.5 py-0.5 text-xs font-medium text-slate-500">
                            Local
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${statusClass(u.status)}`}
                        >
                          {u.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {canUpdate && !u.isSystemAccount && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setEditing(u)
                              setEditForm({
                                fullName: u.fullName,
                                status: u.status,
                                roleCode: (u.roles?.[0] as UserRoleCode) || 'staff',
                              })
                            }}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {data?.meta ? (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <RowsPerPageSelect
            value={perPage}
            onChange={(size) => {
              setPerPage(size)
              setPage(1)
            }}
          />
          <div className="flex items-center justify-end gap-2">
          <Button
            size="sm"
            variant="outline"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-slate-500">
            Page {data.meta.page} of {data.meta.totalPages}
          </span>
          <Button
            size="sm"
            variant="outline"
            disabled={page >= data.meta.totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
