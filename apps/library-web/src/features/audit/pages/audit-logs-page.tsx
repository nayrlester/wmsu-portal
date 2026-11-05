import { useState } from 'react'
import { useAuthStore } from '@/stores/auth-store'
import { useAuditLogs } from '@/hooks/use-audit-logs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export function AuditLogsPage() {
  const user = useAuthStore((s) => s.user)
  const canView = user?.permissions.includes('audit:read')
  const [page, setPage] = useState(1)
  const { data, isLoading, isError } = useAuditLogs(page, canView)

  if (!canView) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
        Audit logs require the audit:read permission.
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Audit Logs</h1>
        <p className="text-sm text-slate-500">Track CRUD actions, logins, and user activity with IP and timestamps.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Activity trail</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-slate-500">Loading audit logs...</p>
          ) : isError || !data ? (
            <p className="text-sm text-red-600">Failed to load audit logs.</p>
          ) : data.items.length === 0 ? (
            <p className="text-sm text-slate-500">No audit entries found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-left text-xs text-slate-500">
                    <th className="pb-2 pr-4 font-medium">Time</th>
                    <th className="pb-2 pr-4 font-medium">User</th>
                    <th className="pb-2 pr-4 font-medium">Action</th>
                    <th className="pb-2 pr-4 font-medium">Resource</th>
                    <th className="pb-2 font-medium">IP</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((log) => (
                    <tr key={log.id} className="border-b border-slate-50">
                      <td className="py-2.5 pr-4 whitespace-nowrap text-slate-600">
                        {new Date(log.createdAt).toLocaleString()}
                      </td>
                      <td className="py-2.5 pr-4 text-slate-900">{log.userEmail ?? '—'}</td>
                      <td className="py-2.5 pr-4">
                        <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                          {log.action}
                        </span>
                      </td>
                      <td className="py-2.5 pr-4 text-slate-600">
                        {log.resourceType}
                        {log.resourceId && (
                          <span className="ml-1 text-xs text-slate-400">{log.resourceId.slice(0, 8)}…</span>
                        )}
                      </td>
                      <td className="py-2.5 text-slate-500">{log.ipAddress ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {data?.meta && data.meta.lastPage > 1 && (
            <div className="mt-4 flex items-center justify-between">
              <p className="text-xs text-slate-500">
                Page {data.meta.currentPage} of {data.meta.lastPage}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= data.meta.lastPage}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
