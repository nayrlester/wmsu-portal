import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ClipboardList, ArrowRight } from 'lucide-react'
import { PageContainer, ContentWrapper, WidgetCard } from '@/components/desk-app'
import { StatusBadge, EmptyState } from '@/components/shared/status-badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Select } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { udmsApi } from '@/api/modules/udms.api'
import { documentsApi } from '@/api/modules/documents.api'
import { formatDate } from '@/lib/utils'
import type { DocumentRecord } from '@/shared/types'

type QueueTab = 'assigned' | 'office' | 'awaiting'

function QueueRows({
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
        icon={ClipboardList}
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
              to={`/app/documents/${doc.id}?tab=timeline`}
              className="font-medium text-foreground hover:underline"
            >
              {doc.title}
            </Link>
            <p className="font-mono text-xs text-muted-foreground">{doc.trackingNumber}</p>
            <p className="text-xs text-muted-foreground">
              Updated {formatDate(doc.updatedAt)}
              {doc.assignedTo?.fullName || doc.assignedTo?.email
                ? ` · Assigned to ${doc.assignedTo.fullName ?? doc.assignedTo.email}`
                : ''}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge status={doc.status} />
            <Link to={`/app/documents/${doc.id}?tab=timeline`}>
              <Button size="sm" variant="ghost">
                Track <ArrowRight className="ml-1 h-3 w-3" />
              </Button>
            </Link>
          </div>
        </div>
      ))}
    </div>
  )
}

export function MyWorkPage() {
  const [tab, setTab] = useState<QueueTab>('assigned')
  const [officeId, setOfficeId] = useState('')

  const { data: departmentsData } = useQuery({
    queryKey: ['document-departments'],
    queryFn: () => documentsApi.departments(),
  })

  const departments = departmentsData?.departments ?? []

  const assignedQuery = useQuery({
    queryKey: ['udms-queue-assigned'],
    queryFn: () => udmsApi.listAssignedQueue({ page: 1, limit: 25 }),
    enabled: tab === 'assigned',
  })

  const officeQuery = useQuery({
    queryKey: ['udms-queue-office', officeId],
    queryFn: () => udmsApi.listOfficeQueue({ officeId, page: 1, limit: 25 }),
    enabled: tab === 'office' && Boolean(officeId),
  })

  const awaitingQuery = useQuery({
    queryKey: ['udms-queue-awaiting'],
    queryFn: () => udmsApi.listAwaitingActionQueue({ page: 1, limit: 25 }),
    enabled: tab === 'awaiting',
  })

  const officeHint = useMemo(() => {
    if (tab !== 'office') return null
    if (!officeId) {
      return 'Select an office. User–office MDM mapping is For Clarification — office queue requires an explicit officeId.'
    }
    return null
  }, [officeId, tab])

  return (
    <PageContainer
      title="My Work"
      breadcrumb="Home / My Work"
      description="Assigned documents, office queues, and items awaiting your workflow action (DMS-007)"
    >
      <ContentWrapper>
        <Tabs value={tab} onValueChange={(value) => setTab(value as QueueTab)}>
          <TabsList>
            <TabsTrigger value="assigned">Assigned to me</TabsTrigger>
            <TabsTrigger value="office">Office queue</TabsTrigger>
            <TabsTrigger value="awaiting">Awaiting my action</TabsTrigger>
          </TabsList>

          <TabsContent value="assigned" className="mt-4">
            <WidgetCard title="Documents assigned to you">
              <QueueRows
                rows={assignedQuery.data?.data ?? []}
                isLoading={assignedQuery.isLoading}
                emptyTitle="No personal assignments"
                emptyDescription="Documents assigned to your account will appear here."
              />
            </WidgetCard>
          </TabsContent>

          <TabsContent value="office" className="mt-4 space-y-4">
            <div className="max-w-md space-y-2">
              <label className="text-sm font-medium" htmlFor="officeQueueSelect">
                Office
              </label>
              <Select
                id="officeQueueSelect"
                value={officeId}
                onChange={(event) => setOfficeId(event.target.value)}
              >
                <option value="">Select office…</option>
                {departments.map((dept) => (
                  <option key={dept.id} value={dept.id}>
                    {dept.name}
                  </option>
                ))}
              </Select>
              {officeHint && <p className="text-sm text-muted-foreground">{officeHint}</p>}
            </div>
            <WidgetCard title="Office document queue">
              <QueueRows
                rows={officeQuery.data?.data ?? []}
                isLoading={Boolean(officeId) && officeQuery.isLoading}
                emptyTitle={officeId ? 'No office documents' : 'Select an office'}
                emptyDescription={
                  officeId
                    ? 'No documents currently linked to this office as department, receiving, or originating office.'
                    : 'Choose an office to load its queue.'
                }
              />
            </WidgetCard>
          </TabsContent>

          <TabsContent value="awaiting" className="mt-4">
            <WidgetCard title="Documents awaiting your action">
              <QueueRows
                rows={awaitingQuery.data?.data ?? []}
                isLoading={awaitingQuery.isLoading}
                emptyTitle="Nothing awaiting action"
                emptyDescription="Assigned items and workflow steps you can act on will appear here."
              />
            </WidgetCard>
          </TabsContent>
        </Tabs>
      </ContentWrapper>
    </PageContainer>
  )
}
