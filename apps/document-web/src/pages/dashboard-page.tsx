import { Link, useNavigate } from 'react-router-dom'
import { FileText, Clock, CheckCircle, XCircle, ArrowRight, Users, UserCheck, Eye, Archive, AlertTriangle, Plus } from 'lucide-react'
import {
  PageContainer,
  ContentWrapper,
  MetricTile,
  WidgetCard,
  ActivityFeed,
  DocumentStatusBadge,
  DocumentCard,
} from '@/components/desk-app'
import { ResponsiveDataView } from '@/components/desk-app/responsive/responsive-data-view'
import { SwipeableList } from '@/components/desk-app/responsive/swipeable-list'
import { RingChartCard, RING_STATUS_COLORS } from '@/components/desk-app/dashboard/ring-chart-card'
import {
  AnalyticsChartCard,
  DashboardTrendsChart,
  DailyFilesTrendChart,
  DASHBOARD_TREND_SKELETON_CLASS,
} from '@/components/shared/charts'
import { useIsMobile } from '@/shared/hooks/use-breakpoint'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  useDashboardOverview,
  useDashboardTrend,
  useUsageTrend,
  useFilesTrend,
  useUserAccess,
  usePendingApprovals,
} from '@/hooks/use-api'
import { useAuthStore } from '@/stores/auth-store'
import { PERMISSIONS } from '@/shared/constants/env'
import { formatDate } from '@/lib/utils'

export function DashboardPage() {
  const navigate = useNavigate()
  const isMobile = useIsMobile()
  const user = useAuthStore((s) => s.user)
  const hasPermission = useAuthStore((s) => s.hasPermission)
  const permissionsReady = useAuthStore((s) => s.permissionsReady)
  const canViewTrend = hasPermission(PERMISSIONS.reportsView)

  const { data: overview, isLoading } = useDashboardOverview()
  const stats = overview?.stats
  const recentDocuments = overview?.recentDocuments ?? []
  const { data: trend, isLoading: trendLoading } = useDashboardTrend(
    permissionsReady && canViewTrend
  )
  const { data: usageTrend, isLoading: usageTrendLoading } = useUsageTrend(
    permissionsReady && canViewTrend
  )
  const { data: filesTrend, isLoading: filesTrendLoading } = useFilesTrend(permissionsReady && canViewTrend)
  const { data: userAccess, isLoading: userAccessLoading } = useUserAccess(permissionsReady)
  const { data: pending, isLoading: pendingLoading } = usePendingApprovals()

  const firstName = user?.fullName?.split(' ')[0] ?? user?.email?.split('@')[0] ?? 'User'
  const canCreateDocument = hasPermission(PERMISSIONS.documentsCreate)

  const ringSegments = [
    { label: 'Approved', value: stats?.approvedDocuments ?? 0, color: RING_STATUS_COLORS.approved },
    { label: 'Pending', value: stats?.pendingDocuments ?? 0, color: RING_STATUS_COLORS.pending },
    { label: 'Rejected', value: stats?.rejectedDocuments ?? 0, color: RING_STATUS_COLORS.rejected },
  ]

  const trendPoints = trend?.monthly ?? []

  const pendingItems =
    pending?.data.slice(0, 6).map((doc) => ({
      id: doc.id,
      avatarText: doc.title.charAt(0).toUpperCase(),
      title: (
        <Link to={`/app/documents/${doc.id}`} className="hover:underline">
          {doc.title}
        </Link>
      ),
      subtitle: doc.trackingNumber,
      action: (
        <Link to={`/app/documents/${doc.id}`}>
          <Button size="sm" variant="ghost">
            Review
          </Button>
        </Link>
      ),
    })) ?? []

  const mobileDocCards =
    recentDocuments.map((doc) => ({
      id: doc.id,
      content: (
        <DocumentCard
          id={doc.id}
          title={doc.title}
          trackingNumber={doc.trackingNumber}
          status={doc.status}
          createdAt={doc.updatedAt}
          href={`/app/documents/${doc.id}`}
        />
      ),
    })) ?? []

  const reportsLink = (
    <Link to="/app/reports">
      <Button variant="ghost" size="sm" className="rounded-full">
        View reports <ArrowRight className="ml-1 h-3 w-3" />
      </Button>
    </Link>
  )

  return (
    <PageContainer
      title={`Good ${getGreeting()}, ${firstName}`}
      description="Overview of document volume, approvals, and recent activity."
      breadcrumb="Dashboard"
      action={
        canCreateDocument ? (
          <Link to="/app/documents/create">
            <Button>
              <Plus className="mr-1 h-4 w-4" aria-hidden />
              Create document
            </Button>
          </Link>
        ) : undefined
      }
    >
      <ContentWrapper className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricTile
            label="Total documents"
            value={stats?.totalDocuments ?? 0}
            icon={FileText}
            loading={isLoading}
          />
          <MetricTile
            label="Pending"
            value={stats?.pendingDocuments ?? 0}
            icon={Clock}
            loading={isLoading}
          />
          <MetricTile
            label="Approved"
            value={stats?.approvedDocuments ?? 0}
            icon={CheckCircle}
            loading={isLoading}
          />
          <MetricTile
            label="Rejected"
            value={stats?.rejectedDocuments ?? 0}
            icon={XCircle}
            loading={isLoading}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricTile
            label="Due for archival"
            value={stats?.records?.dueForArchival ?? 0}
            icon={Archive}
            loading={isLoading}
          />
          <MetricTile
            label="Approaching retention"
            value={stats?.records?.approachingRetention ?? 0}
            icon={AlertTriangle}
            loading={isLoading}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricTile
            label="Total users"
            value={userAccess?.totalUsers ?? 0}
            icon={Users}
            loading={userAccessLoading}
          />
          <MetricTile
            label="Active logins (7d)"
            value={userAccess?.activeUsers7d ?? 0}
            icon={UserCheck}
            loading={userAccessLoading}
          />
          <MetricTile
            label="Active logins (30d)"
            value={userAccess?.activeUsers30d ?? 0}
            icon={UserCheck}
            loading={userAccessLoading}
          />
          <MetricTile
            label="Document viewers (7d)"
            value={userAccess?.uniqueViewers7d ?? 0}
            icon={Eye}
            loading={userAccessLoading}
          />
        </div>

        {canViewTrend && (
          <div className="grid gap-4 lg:grid-cols-2 lg:gap-6">
            <AnalyticsChartCard
              title="Trends overview"
              description="Monthly plan usage and document volume"
              action={reportsLink}
            >
              {usageTrendLoading || trendLoading ? (
                <Skeleton className={DASHBOARD_TREND_SKELETON_CLASS} />
              ) : (
                <DashboardTrendsChart usageTrend={usageTrend} documentTrend={trendPoints} />
              )}
            </AnalyticsChartCard>

            <AnalyticsChartCard
              title="Daily file uploads"
              description="Files added per day over the last 30 days"
              action={reportsLink}
            >
              {filesTrendLoading ? (
                <Skeleton className={DASHBOARD_TREND_SKELETON_CLASS} />
              ) : (
                <DailyFilesTrendChart points={filesTrend?.daily ?? []} />
              )}
            </AnalyticsChartCard>
          </div>
        )}

        <div className="grid gap-4 lg:grid-cols-5 lg:gap-6">
          <WidgetCard
            title="Pending approvals"
            description="Documents waiting for your action"
            className="rounded-2xl border-border/70 shadow-sm lg:col-span-3"
            action={
              <Link to="/app/approvals">
                <Button variant="ghost" size="sm" className="rounded-full">
                  View all
                </Button>
              </Link>
            }
            bodyClassName="pt-2"
          >
            <ActivityFeed
              items={pendingItems}
              loading={pendingLoading}
              emptyMessage="No documents awaiting approval."
            />
          </WidgetCard>

          <RingChartCard
            title="Volume breakdown"
            segments={ringSegments}
            centerLabel="Total"
            centerValue={stats?.totalDocuments ?? 0}
            loading={isLoading}
            className="lg:col-span-2"
          />
        </div>

        <WidgetCard
          title="Recent documents"
          className="rounded-2xl border-border/70 shadow-sm"
          action={
            <Link to="/app/documents">
              <Button variant="outline" size="sm" className="rounded-full">
                View all <ArrowRight className="ml-1 h-3 w-3" />
              </Button>
            </Link>
          }
        >
          {isMobile ? (
            <SwipeableList
              items={mobileDocCards}
              onSwipeLeft={(id) => navigate(`/app/documents/${id}`)}
            />
          ) : (
            <ResponsiveDataView<{
              id: string
              title: string
              trackingNumber: string
              status: string
              updatedAt: string
            }>
              loading={isLoading}
              data={recentDocuments}
              keyExtractor={(record) => record.id}
              emptyMessage="No documents yet"
              mobileCardRender={(record) => (
                <DocumentCard
                  id={record.id}
                  title={record.title}
                  trackingNumber={record.trackingNumber}
                  status={record.status}
                  createdAt={record.updatedAt}
                  href={`/app/documents/${record.id}`}
                />
              )}
              columns={[
                {
                  key: 'trackingNumber',
                  header: 'Tracking',
                  sortable: true,
                  render: (record) => (
                    <span className="font-mono text-caption">{record.trackingNumber}</span>
                  ),
                },
                {
                  key: 'title',
                  header: 'Title',
                  sortable: true,
                  render: (record) => (
                    <Link
                      to={`/app/documents/${record.id}`}
                      className="text-sm font-medium hover:underline"
                    >
                      {record.title}
                    </Link>
                  ),
                },
                {
                  key: 'status',
                  header: 'Status',
                  render: (record) => <DocumentStatusBadge status={record.status} />,
                },
                {
                  key: 'updatedAt',
                  header: 'Updated',
                  sortable: true,
                  render: (record) => (
                    <span className="text-caption">{formatDate(record.updatedAt)}</span>
                  ),
                },
              ]}
            />
          )}
        </WidgetCard>
      </ContentWrapper>
    </PageContainer>
  )
}

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'morning'
  if (hour < 17) return 'afternoon'
  return 'evening'
}
