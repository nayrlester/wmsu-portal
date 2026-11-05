import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Archive, ArrowRight } from 'lucide-react'
import { PageContainer, ContentWrapper, WidgetCard } from '@/components/desk-app'
import { StatusBadge, EmptyState } from '@/components/shared/status-badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { udmsApi } from '@/api/modules/udms.api'
import { formatDate } from '@/lib/utils'
import { useAuthStore } from '@/stores/auth-store'
import { PERMISSIONS } from '@/shared/constants/env'
import type { DocumentRecord } from '@/shared/types'

function DocRows({
  rows,
  isLoading,
  emptyTitle,
  emptyDescription,
}: {
  rows: DocumentRecord[]
  isLoading: boolean
  emptyTitle: string
  emptyDescription: string
}) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-16 w-full" />
        ))}
      </div>
    )
  }

  if (!rows.length) {
    return (
      <EmptyState
        icon={Archive}
        title={emptyTitle}
        description={emptyDescription}
        action={
          <Link to="/app/documents">
            <Button variant="outline">Browse repository</Button>
          </Link>
        }
      />
    )
  }

  return (
    <div className="space-y-3">
      {rows.map((doc) => (
        <div
          key={doc.id}
          className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border px-3 py-3"
        >
          <div className="min-w-0 space-y-1">
            <Link
              to={`/app/documents/${doc.id}`}
              className="font-medium text-foreground hover:underline"
            >
              {doc.title}
            </Link>
            <p className="font-mono text-xs text-muted-foreground">{doc.trackingNumber}</p>
            <p className="text-xs text-muted-foreground">
              {doc.retentionDueAt
                ? `Retention due ${formatDate(doc.retentionDueAt)}`
                : `Updated ${formatDate(doc.updatedAt)}`}
              {doc.lifecycleStatus ? ` · ${doc.lifecycleStatus.replaceAll('_', ' ')}` : ''}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge status={doc.status} />
            <Link to={`/app/documents/${doc.id}`}>
              <Button size="sm" variant="ghost">
                Open <ArrowRight className="ml-1 h-3 w-3" />
              </Button>
            </Link>
          </div>
        </div>
      ))}
    </div>
  )
}

export function LifecycleDeskPage() {
  const hasPermission = useAuthStore((s) => s.hasPermission)
  const canRetention = hasPermission(PERMISSIONS.recordsRetentionManage)
  const [tab, setTab] = useState<'archived' | 'due' | 'schedules'>('archived')

  const archivedQuery = useQuery({
    queryKey: ['udms-archived'],
    queryFn: () => udmsApi.listArchived({ page: 1, limit: 25 }),
    enabled: tab === 'archived',
  })

  const dueQuery = useQuery({
    queryKey: ['udms-retention-due'],
    queryFn: () => udmsApi.listRetentionDue({ page: 1, limit: 25 }),
    enabled: tab === 'due' && canRetention,
  })

  const schedulesQuery = useQuery({
    queryKey: ['udms-retention-schedules'],
    queryFn: () => udmsApi.listRetentionSchedules(),
    enabled: tab === 'schedules',
  })

  return (
    <PageContainer
      title="Lifecycle & Retention"
      breadcrumb="Home / Lifecycle"
      description="Archived records, retention monitoring, and configured schedules (DMS-009 / DMS-019–020)"
    >
      <ContentWrapper>
        <Tabs value={tab} onValueChange={(value) => setTab(value as typeof tab)}>
          <TabsList>
            <TabsTrigger value="archived">Archived</TabsTrigger>
            <TabsTrigger value="due" disabled={!canRetention}>
              Retention due
            </TabsTrigger>
            <TabsTrigger value="schedules">Schedules</TabsTrigger>
          </TabsList>

          <TabsContent value="archived" className="mt-4">
            <WidgetCard title="Archived documents">
              <DocRows
                rows={archivedQuery.data?.data ?? []}
                isLoading={archivedQuery.isLoading}
                emptyTitle="No archived documents"
                emptyDescription="Documents archived through approved status transitions appear here."
              />
            </WidgetCard>
          </TabsContent>

          <TabsContent value="due" className="mt-4">
            <WidgetCard title="Retention due / overdue">
              <p className="mb-3 text-sm text-muted-foreground">
                Based on configured schedule due dates only. Official NAP period tables remain For
                Clarification — no invented auto-disposal.
              </p>
              <DocRows
                rows={dueQuery.data?.data ?? []}
                isLoading={dueQuery.isLoading}
                emptyTitle="Nothing due"
                emptyDescription="No documents currently have a past retention due date."
              />
            </WidgetCard>
          </TabsContent>

          <TabsContent value="schedules" className="mt-4">
            <WidgetCard title="Configured retention schedules">
              {schedulesQuery.isLoading ? (
                <Skeleton className="h-24 w-full" />
              ) : !(schedulesQuery.data?.data ?? []).length ? (
                <EmptyState
                  icon={Archive}
                  title="No schedules"
                  description="Configure schedules in Settings. Period values are tenant-configured, not TOR-invented."
                />
              ) : (
                <div className="space-y-3">
                  {(schedulesQuery.data?.data ?? []).map((schedule) => (
                    <div
                      key={schedule.id}
                      className="rounded-md border border-border px-3 py-3 text-sm"
                    >
                      <p className="font-medium">
                        {schedule.name}{' '}
                        <span className="font-mono text-xs text-muted-foreground">
                          {schedule.code}
                        </span>
                      </p>
                      <p className="text-muted-foreground">
                        NAP {schedule.napCategory.replaceAll('_', ' ')} ·{' '}
                        {schedule.retentionYears}y {schedule.retentionMonths}m ·{' '}
                        {schedule.dispositionAction}
                        {schedule.isSystem ? ' · system' : ''}
                      </p>
                    </div>
                  ))}
                  <p className="text-xs text-muted-foreground">
                    {schedulesQuery.data?.policyNotes?.retentionPeriods}
                  </p>
                </div>
              )}
            </WidgetCard>
          </TabsContent>
        </Tabs>
      </ContentWrapper>
    </PageContainer>
  )
}
