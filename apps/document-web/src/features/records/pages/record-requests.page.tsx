import { Link, useSearchParams } from 'react-router-dom'
import { ArchiveRestore, Plus, AlertTriangle } from 'lucide-react'
import { PageContainer, ContentWrapper, WidgetCard } from '@/components/desk-app'
import { EmptyState } from '@/components/shared/status-badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { useRecordRequests } from '@/features/records/hooks/use-record-requests'
import { useAuthStore } from '@/stores/auth-store'
import { PERMISSIONS } from '@/shared/constants/env'
import { formatDate } from '@/lib/utils'

function statusTone(status: string, overdue: boolean): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (overdue) return 'destructive'
  if (status === 'approved' || status === 'returned') return 'default'
  if (status === 'denied' || status === 'cancelled') return 'secondary'
  return 'outline'
}

export function RecordRequestsPage() {
  const [params] = useSearchParams()
  const overdueOnly = params.get('overdue') === '1'
  const canManage = useAuthStore((s) => s.hasPermission(PERMISSIONS.recordsReleaseManage))
  const { data, isLoading } = useRecordRequests({
    ...(canManage ? {} : { mine: true }),
    ...(overdueOnly ? { overdue: true } : {}),
  })
  const rows = data?.data ?? []

  return (
    <PageContainer
      title={canManage ? 'Records release desk' : 'My record requests'}
      breadcrumb="Home / Records / Requests"
      description={
        canManage
          ? 'Approve, release, and track checkout/return of university records'
          : 'Track your requests for record access and physical release'
      }
      action={
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          {canManage && (
            <Link
              to={overdueOnly ? '/app/records/requests' : '/app/records/requests?overdue=1'}
              className="w-full sm:w-auto"
            >
              <Button variant={overdueOnly ? 'default' : 'outline'} size="sm" className="w-full">
                <AlertTriangle className="mr-1 h-4 w-4" />
                {overdueOnly ? 'Showing overdue' : 'Overdue'}
              </Button>
            </Link>
          )}
          <Link to="/app/records/requests/new" className="w-full sm:w-auto">
            <Button size="sm" className="w-full">
              <Plus className="mr-1 h-4 w-4" />
              New request
            </Button>
          </Link>
        </div>
      }
    >
      <ContentWrapper>
        <WidgetCard title="Requests">
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : !rows.length ? (
            <EmptyState
              icon={ArchiveRestore}
              title="No requests yet"
              description="Submit a request to access or check out registered records."
              action={
                <Link to="/app/records/requests/new">
                  <Button>Request records</Button>
                </Link>
              }
            />
          ) : (
            <ul className="divide-y divide-border">
              {rows.map((req) => (
                <li
                  key={req.id}
                  className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        to={`/app/records/requests/${req.id}`}
                        className="font-semibold text-primary hover:underline"
                      >
                        {req.requestNumber}
                      </Link>
                      <Badge variant={statusTone(req.status, req.isOverdue)}>
                        {req.isOverdue ? 'overdue' : req.status.replaceAll('_', ' ')}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2 break-words">
                      {req.purpose}
                    </p>
                    <p className="text-xs text-muted-foreground break-words">
                      {req.requester?.fullName ?? req.requester?.email} · {req.items.length} item(s)
                      · {formatDate(req.createdAt)}
                      {req.dueAt ? ` · due ${formatDate(req.dueAt)}` : ''}
                    </p>
                  </div>
                  <Link to={`/app/records/requests/${req.id}`} className="w-full shrink-0 sm:w-auto">
                    <Button variant="outline" className="w-full sm:w-auto">
                      Open
                    </Button>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </WidgetCard>
      </ContentWrapper>
    </PageContainer>
  )
}
