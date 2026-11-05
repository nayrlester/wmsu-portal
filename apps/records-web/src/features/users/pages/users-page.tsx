import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Search, Users } from 'lucide-react'
import { apiClient } from '@/lib/api-client'
import { formatLabelList, type DisplayLabel } from '@/lib/utils'
import {
  EmptyState,
  PageHeader,
  SectionCard,
  StatusBadge,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
  TableShell,
} from '@/components/ui/page-chrome'

interface UserRecord {
  id: string
  email: string
  fullName: string | null
  status: string
  roles: DisplayLabel[]
  lastLoginAt: string | null
}

export function UsersPage() {
  const [search, setSearch] = useState('')
  const { data: result, isLoading } = useQuery({
    queryKey: ['users', search],
    queryFn: async () => {
      const { data } = await apiClient.get('/users', {
        params: { q: search || undefined, perPage: 50 },
      })
      return data.data ?? data
    },
  })
  const users: UserRecord[] = Array.isArray(result) ? result : result?.data ?? []

  return (
    <div className="space-y-5">
      <PageHeader title="Users" description="Manage system users and access" />

      <SectionCard padding="sm">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search users…"
            className="w-full rounded-lg border border-slate-200 bg-slate-50/50 py-2 pl-9 pr-3 text-sm transition focus:border-blue-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
        </div>
      </SectionCard>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-10 animate-pulse rounded-lg bg-slate-200/60" />
          ))}
        </div>
      ) : users.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No users found"
          description="Users are provisioned through the Identity Service."
        />
      ) : (
        <SectionCard padding="none">
          <TableShell>
            <TableHead>
              <TableRow>
                <TableHeaderCell>Name</TableHeaderCell>
                <TableHeaderCell>Email</TableHeaderCell>
                <TableHeaderCell>Roles</TableHeaderCell>
                <TableHeaderCell>Status</TableHeaderCell>
                <TableHeaderCell>Last Login</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {users.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">{u.fullName ?? '—'}</TableCell>
                  <TableCell>{u.email}</TableCell>
                  <TableCell className="text-xs text-slate-500">
                    {formatLabelList(u.roles)}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={u.status} />
                  </TableCell>
                  <TableCell className="text-xs">{u.lastLoginAt?.slice(0, 10) ?? '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </TableShell>
        </SectionCard>
      )}
    </div>
  )
}
