import { useQuery } from '@tanstack/react-query'
import { Shield } from 'lucide-react'
import { apiClient } from '@/lib/api-client'
import { formatLabelList, type DisplayLabel } from '@/lib/utils'
import {
  EmptyState,
  PageHeader,
  SectionCard,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
  TableShell,
} from '@/components/ui/page-chrome'

interface RoleRecord {
  id: string
  slug?: string
  code?: string
  name: string
  description?: string | null
  permissions: DisplayLabel[]
}

export function RolesPage() {
  const { data: result, isLoading } = useQuery({
    queryKey: ['roles'],
    queryFn: async () => {
      const { data } = await apiClient.get('/roles')
      return data.data ?? data
    },
  })
  const roles: RoleRecord[] = Array.isArray(result) ? result : result?.data ?? []

  return (
    <div className="space-y-5">
      <PageHeader title="Roles" description="View roles and permissions (assignment via Identity / Platform Access)" />

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-10 animate-pulse rounded-lg bg-slate-200/60" />
          ))}
        </div>
      ) : roles.length === 0 ? (
        <EmptyState
          icon={Shield}
          title="No roles defined"
          description="Roles and permissions are managed through the API."
        />
      ) : (
        <SectionCard padding="none">
          <TableShell>
            <TableHead>
              <TableRow>
                <TableHeaderCell>Code</TableHeaderCell>
                <TableHeaderCell>Name</TableHeaderCell>
                <TableHeaderCell>Description</TableHeaderCell>
                <TableHeaderCell>Permissions</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {roles.map((role) => (
                <TableRow key={role.id}>
                  <TableCell className="font-mono text-xs">
                    {role.slug || role.code || '—'}
                  </TableCell>
                  <TableCell className="font-medium">{role.name}</TableCell>
                  <TableCell className="max-w-[200px] truncate text-xs text-slate-500">
                    {role.description || '—'}
                  </TableCell>
                  <TableCell className="max-w-[250px] text-xs text-slate-500">
                    {formatLabelList(role.permissions, { limit: 3 })}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </TableShell>
        </SectionCard>
      )}
    </div>
  )
}
