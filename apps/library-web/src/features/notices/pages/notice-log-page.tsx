import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/stores/auth-store'
import { fetchNoticeLog } from '@/lib/notice-log-api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const channelLabel: Record<string, string> = {
  email: 'Email',
  sms: 'SMS',
  in_app: 'In system',
}

const statusLabel: Record<string, string> = {
  sent: 'Sent',
  failed: 'Failed',
  pending: 'Pending',
}

function whenLabel(value: string) {
  return new Date(value).toLocaleString('en-PH', { timeZone: 'Asia/Manila' })
}

export function NoticeLogPage() {
  const user = useAuthStore((s) => s.user)
  const canView = user?.permissions.includes('reports:export')
  const { data, isLoading, isError } = useQuery({
    queryKey: ['notice-log'],
    queryFn: () => fetchNoticeLog(1),
    enabled: Boolean(canView),
  })

  if (!canView) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
        The notice log requires the reports export permission.
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Notice log</h1>
        <p className="text-sm text-slate-500">
          Email, SMS, and in-system alerts already sent for due dates, returns, and checkout.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Sent notices</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-slate-500">Loading notice log...</p>
          ) : isError || !data ? (
            <p className="text-sm text-red-600">Failed to load the notice log.</p>
          ) : data.items.length === 0 ? (
            <p className="text-sm text-slate-500">No notices have been sent.</p>
          ) : (
            <>
              <div className="space-y-3 md:hidden">
                {data.items.map((entry) => (
                  <div key={entry.id} className="space-y-1 rounded-lg border border-slate-100 p-3 text-sm">
                    <p className="whitespace-nowrap text-slate-500">{whenLabel(entry.createdAt)}</p>
                    <p className="font-medium text-slate-900">{entry.title}</p>
                    <p className="whitespace-nowrap text-slate-700">
                      {channelLabel[entry.channel] ?? entry.channel} · {statusLabel[entry.status] ?? entry.status}
                    </p>
                    {entry.failedReason ? <p className="text-slate-500">{entry.failedReason}</p> : null}
                  </div>
                ))}
              </div>
              <table className="hidden min-w-full text-left text-sm md:table" data-testid="notice-log-table">
                <thead>
                  <tr className="border-b border-slate-100 text-left text-xs text-slate-500">
                    <th className="whitespace-nowrap pb-2 pr-4 font-medium">When</th>
                    <th className="whitespace-nowrap pb-2 pr-4 font-medium">Channel</th>
                    <th className="whitespace-nowrap pb-2 pr-4 font-medium">Notice</th>
                    <th className="whitespace-nowrap pb-2 pr-4 font-medium">Status</th>
                    <th className="whitespace-nowrap pb-2 font-medium">Detail</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((entry) => (
                    <tr key={entry.id} className="border-b border-slate-50">
                      <td className="whitespace-nowrap py-2.5 pr-4 text-slate-600">{whenLabel(entry.createdAt)}</td>
                      <td className="whitespace-nowrap py-2.5 pr-4">{channelLabel[entry.channel] ?? entry.channel}</td>
                      <td className="py-2.5 pr-4 text-slate-900">{entry.title}</td>
                      <td className="whitespace-nowrap py-2.5 pr-4">{statusLabel[entry.status] ?? entry.status}</td>
                      <td className="py-2.5 text-slate-500">{entry.failedReason ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
