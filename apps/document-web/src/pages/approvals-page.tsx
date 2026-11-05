import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { CheckSquare, ArrowRight } from 'lucide-react'
import { PageContainer, ContentWrapper, WidgetCard } from '@/components/desk-app'
import { StatusBadge, EmptyState } from '@/components/shared/status-badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { usePendingApprovals } from '@/hooks/use-api'
import { approvalsApi } from '@/api/modules/approvals.api'
import { toast } from '@/shared/store/toast-store'
import { formatDate } from '@/lib/utils'
import { useQueryClient } from '@tanstack/react-query'

export function ApprovalsPage() {
  const queryClient = useQueryClient()
  const { data, isLoading } = usePendingApprovals()
  const [selected, setSelected] = useState<string[]>([])
  const [busy, setBusy] = useState(false)

  const rows = data?.data ?? []
  const allSelected = useMemo(
    () => rows.length > 0 && rows.every((doc) => selected.includes(doc.id)),
    [rows, selected]
  )

  const toggle = (id: string, checked: boolean) => {
    setSelected((prev) => (checked ? Array.from(new Set([...prev, id])) : prev.filter((x) => x !== id)))
  }

  const toggleAll = (checked: boolean) => {
    setSelected(checked ? rows.map((doc) => doc.id) : [])
  }

  const runBulk = async (action: 'approve' | 'reject' | 'return') => {
    if (!selected.length) return
    setBusy(true)
    try {
      const result = await approvalsApi.bulkAct({
        documentIds: selected,
        action,
        comments: action === 'reject' ? 'Bulk reject from Approvals desk' : undefined,
      })
      toast.success(
        'Bulk approval finished',
        `${result.succeeded} succeeded · ${result.failed} failed`
      )
      setSelected([])
      await queryClient.invalidateQueries({ queryKey: ['pending-approvals'] })
      await queryClient.invalidateQueries({ queryKey: ['documents'] })
    } catch {
      toast.error('Bulk approval failed', 'Try again or open documents individually.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <PageContainer
      title="Approvals"
      breadcrumb="Home / Approvals"
      description="Documents awaiting your review and action"
    >
      <ContentWrapper>
        <WidgetCard
          title="Pending approvals"
          action={
            <div className="flex flex-wrap items-center gap-2">
              {selected.length > 0 && (
                <>
                  <Button size="sm" disabled={busy} onClick={() => runBulk('approve')}>
                    Approve ({selected.length})
                  </Button>
                  <Button size="sm" variant="outline" disabled={busy} onClick={() => runBulk('return')}>
                    Return
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    disabled={busy}
                    onClick={() => runBulk('reject')}
                  >
                    Reject
                  </Button>
                </>
              )}
              <Link to="/app/documents">
                <Button variant="ghost" size="sm">
                  Browse all <ArrowRight className="ml-1 h-3 w-3" />
                </Button>
              </Link>
            </div>
          }
        >
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, index) => (
                <Skeleton key={index} className="h-16 w-full" />
              ))}
            </div>
          ) : !rows.length ? (
            <EmptyState
              icon={CheckSquare}
              title="All caught up"
              description="No documents are pending your approval right now."
              action={
                <Link to="/app/documents">
                  <Button variant="outline">Browse documents</Button>
                </Link>
              }
            />
          ) : (
            <div className="space-y-3">
              <label className="flex items-center gap-2 text-sm text-muted-foreground">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-primary"
                  checked={allSelected}
                  onChange={(e) => toggleAll(e.target.checked)}
                />
                Select all on this page
              </label>
              <ul className="divide-y divide-border">
                {rows.map((doc) => (
                  <li
                    key={doc.id}
                    className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex min-w-0 items-start gap-3">
                      <input
                        type="checkbox"
                        className="mt-2 h-4 w-4 accent-primary"
                        checked={selected.includes(doc.id)}
                        onChange={(e) => toggle(doc.id, e.target.checked)}
                        aria-label={`Select ${doc.title}`}
                      />
                      <div
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary"
                        aria-hidden
                      >
                        {doc.title.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <Link
                            to={`/app/documents/${doc.id}`}
                            className="font-semibold text-primary hover:underline"
                          >
                            {doc.title}
                          </Link>
                          <StatusBadge status={doc.status} />
                        </div>
                        <p className="mt-1 font-mono text-xs text-muted-foreground">
                          {doc.trackingNumber}
                        </p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          Submitted {formatDate(doc.createdAt)}
                        </p>
                      </div>
                    </div>
                    <Link to={`/app/documents/${doc.id}`} className="shrink-0">
                      <Button>Review</Button>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </WidgetCard>
      </ContentWrapper>
    </PageContainer>
  )
}
