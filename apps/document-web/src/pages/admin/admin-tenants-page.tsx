import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { adminApi, formatBytes, formatCurrency } from '@/lib/admin-api'

const statusColors: Record<string, string> = {
  active: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
  trialing: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  suspended: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
  cancelled: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
}

export function AdminTenantsPage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['admin-tenants', search, status],
    queryFn: () =>
      adminApi.tenants({ search: search || undefined, status: status || undefined, limit: 50 }),
  })

  const { data: usageData } = useQuery({
    queryKey: ['admin-tenant-usage'],
    queryFn: () => adminApi.analyticsTenants({ limit: 50 }),
  })

  const usageMap = new Map(usageData?.data.map((row) => [row.tenantId, row]))

  const suspendMutation = useMutation({
    mutationFn: (id: string) => adminApi.suspendTenant(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-tenants'] })
      queryClient.invalidateQueries({ queryKey: ['admin-overview'] })
    },
  })

  const activateMutation = useMutation({
    mutationFn: (id: string) => adminApi.activateTenant(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-tenants'] })
      queryClient.invalidateQueries({ queryKey: ['admin-overview'] })
    },
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Manage Tenants</h1>
        <p className="text-muted-foreground">Organizations on the platform</p>
      </div>

      <div className="flex flex-wrap gap-3">
        <Input
          placeholder="Search by name or slug..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="h-10 rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="trialing">Trialing</option>
          <option value="suspended">Suspended</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Tenants</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {isLoading ? (
            <div className="h-40 animate-pulse rounded bg-muted" />
          ) : (
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th className="pb-3 pr-4 font-medium">Organization</th>
                  <th className="pb-3 pr-4 font-medium">Status</th>
                  <th className="pb-3 pr-4 font-medium">Plan</th>
                  <th className="pb-3 pr-4 font-medium">Usage</th>
                  <th className="pb-3 pr-4 font-medium">MRR</th>
                  <th className="pb-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {data?.data.map((tenant) => {
                  const usage = usageMap.get(tenant.id)
                  return (
                    <tr key={tenant.id} className="border-b border-border/60">
                      <td className="py-3 pr-4">
                        <p className="font-medium">{tenant.name}</p>
                        <p className="text-xs text-muted-foreground">{tenant.slug}</p>
                      </td>
                      <td className="py-3 pr-4">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[tenant.status] ?? 'bg-muted'}`}>
                          {tenant.status}
                        </span>
                      </td>
                      <td className="py-3 pr-4">{usage?.planName ?? tenant.planTier ?? '—'}</td>
                      <td className="py-3 pr-4 text-xs text-muted-foreground">
                        {usage ? (
                          <>
                            {usage.users} users · {usage.documents} docs · {formatBytes(usage.storageBytes)}
                          </>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="py-3 pr-4">{usage ? formatCurrency(usage.mrr) : '—'}</td>
                      <td className="py-3">
                        {tenant.status === 'suspended' ? (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={activateMutation.isPending}
                            onClick={() => activateMutation.mutate(tenant.id)}
                          >
                            Activate
                          </Button>
                        ) : tenant.status !== 'cancelled' ? (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={suspendMutation.isPending}
                            onClick={() => suspendMutation.mutate(tenant.id)}
                          >
                            Suspend
                          </Button>
                        ) : null}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
