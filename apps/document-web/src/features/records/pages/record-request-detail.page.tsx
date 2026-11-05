import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { PageContainer, ContentWrapper, WidgetCard } from '@/components/desk-app'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import {
  useApproveRecordRequest,
  useCancelRecordRequest,
  useDenyRecordRequest,
  useRecordRequest,
  useReleaseRecordRequest,
  useReturnRecordRequest,
} from '@/features/records/hooks/use-record-requests'
import { useAuthStore } from '@/stores/auth-store'
import { PERMISSIONS } from '@/shared/constants/env'
import { formatDate } from '@/lib/utils'
import { toast } from '@/shared/store/toast-store'

export function RecordRequestDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const userId = useAuthStore((s) => s.user?.id)
  const canManage = useAuthStore((s) => s.hasPermission(PERMISSIONS.recordsReleaseManage))
  const { data, isLoading } = useRecordRequest(id)
  const request = data?.data

  const approve = useApproveRecordRequest()
  const deny = useDenyRecordRequest()
  const release = useReleaseRecordRequest()
  const returnItems = useReturnRecordRequest()
  const cancel = useCancelRecordRequest()

  const [denyReason, setDenyReason] = useState('')
  const [actionNotes, setActionNotes] = useState('')

  if (isLoading || !request) {
    return (
      <PageContainer title="Record request" breadcrumb="Home / Records / Requests">
        <ContentWrapper>
          <Skeleton className="h-40 w-full" />
        </ContentWrapper>
      </PageContainer>
    )
  }

  const isRequester = request.requester?.id === userId
  const canCancel =
    (isRequester || canManage) &&
    (request.status === 'pending' || request.status === 'approved')

  async function run(action: () => Promise<unknown>, ok: string) {
    try {
      await action()
      toast.success(ok)
    } catch (err) {
      toast.error('Action failed', err instanceof Error ? err.message : 'Unknown error')
    }
  }

  return (
    <PageContainer
      title={request.requestNumber}
      breadcrumb="Home / Records / Requests / Detail"
      description={request.purpose}
      action={
        <Button
          variant="outline"
          className="w-full sm:w-auto"
          onClick={() => navigate('/app/records/requests')}
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back
        </Button>
      }
    >
      <ContentWrapper>
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          <Meta label="Status" value={request.isOverdue ? 'overdue' : request.status} />
          <Meta label="Access mode" value={request.accessMode.replaceAll('_', ' ')} />
          <Meta
            label="Requester"
            value={request.requester?.fullName ?? request.requester?.email ?? '—'}
          />
          <Meta label="Due" value={request.dueAt ? formatDate(request.dueAt) : '—'} />
        </div>

        {request.denialReason && (
          <WidgetCard title="Denial reason">
            <p className="text-sm text-muted-foreground break-words">{request.denialReason}</p>
          </WidgetCard>
        )}

        <WidgetCard title="Requested records">
          <ul className="divide-y divide-border">
            {request.items.map((item) => (
              <li
                key={item.id}
                className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <Link
                    to={`/app/documents/${item.document.id}`}
                    className="font-medium text-primary hover:underline break-words"
                  >
                    {item.document.title ?? 'Document'}
                  </Link>
                  <p className="text-xs font-mono text-muted-foreground break-all">
                    {item.document.trackingNumber}
                  </p>
                </div>
                <Badge variant="outline" className="w-fit shrink-0">
                  {item.status.replaceAll('_', ' ')}
                </Badge>
              </li>
            ))}
          </ul>
        </WidgetCard>

        {canManage && (
          <WidgetCard title="Desk actions">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="action-notes">Action notes</Label>
                <Textarea
                  id="action-notes"
                  value={actionNotes}
                  onChange={(e) => setActionNotes(e.target.value)}
                  rows={2}
                  className="w-full"
                />
              </div>

              {request.status === 'pending' && (
                <div className="space-y-4">
                  <Button
                    className="w-full sm:w-auto"
                    disabled={approve.isPending}
                    onClick={() => run(() => approve.mutateAsync(request.id), 'Request approved')}
                  >
                    Approve
                  </Button>

                  <div className="space-y-2 rounded-lg border border-border p-3 sm:p-4">
                    <Label htmlFor="deny-reason">Denial reason</Label>
                    <Textarea
                      id="deny-reason"
                      placeholder="Required to deny this request"
                      value={denyReason}
                      onChange={(e) => setDenyReason(e.target.value)}
                      rows={2}
                      className="w-full"
                    />
                    <Button
                      variant="destructive"
                      className="w-full sm:w-auto"
                      disabled={deny.isPending || denyReason.trim().length < 3}
                      onClick={() =>
                        run(
                          () => deny.mutateAsync({ id: request.id, reason: denyReason.trim() }),
                          'Request denied'
                        )
                      }
                    >
                      Deny request
                    </Button>
                  </div>
                </div>
              )}

              {(request.status === 'approved' ||
                request.status === 'checked_out' ||
                request.status === 'partially_returned') && (
                <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                  <Button
                    className="w-full sm:w-auto"
                    disabled={release.isPending}
                    onClick={() =>
                      run(
                        () =>
                          release.mutateAsync({
                            id: request.id,
                            notes: actionNotes.trim() || undefined,
                          }),
                        'Records released'
                      )
                    }
                  >
                    Release / checkout
                  </Button>
                  {(request.status === 'checked_out' ||
                    request.status === 'partially_returned') && (
                    <Button
                      variant="outline"
                      className="w-full sm:w-auto"
                      disabled={returnItems.isPending}
                      onClick={() =>
                        run(
                          () =>
                            returnItems.mutateAsync({
                              id: request.id,
                              notes: actionNotes.trim() || undefined,
                            }),
                          'Return recorded'
                        )
                      }
                    >
                      Mark returned
                    </Button>
                  )}
                </div>
              )}
            </div>
          </WidgetCard>
        )}

        {canCancel && (
          <div className="flex justify-stretch sm:justify-end">
            <Button
              variant="ghost"
              className="w-full sm:w-auto text-muted-foreground"
              disabled={cancel.isPending}
              onClick={() =>
                run(() => cancel.mutateAsync({ id: request.id }), 'Request cancelled').then(() =>
                  navigate('/app/records/requests')
                )
              }
            >
              Cancel request
            </Button>
          </div>
        )}

        <WidgetCard title="Release log">
          {!request.events?.length ? (
            <p className="text-sm text-muted-foreground">No events yet.</p>
          ) : (
            <ul className="space-y-3">
              {request.events.map((event) => (
                <li key={event.id} className="border-l-2 border-border pl-3">
                  <p className="text-sm font-medium capitalize">
                    {event.eventType.replaceAll('_', ' ')}
                  </p>
                  <p className="text-xs text-muted-foreground break-words">
                    {event.actor?.fullName ?? event.actor?.email ?? 'System'} ·{' '}
                    {formatDate(event.createdAt)}
                  </p>
                  {event.notes && (
                    <p className="mt-1 text-sm text-muted-foreground break-words">{event.notes}</p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </WidgetCard>
      </ContentWrapper>
    </PageContainer>
  )
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-lg border border-border p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-medium capitalize break-words">{value.replaceAll('_', ' ')}</p>
    </div>
  )
}
