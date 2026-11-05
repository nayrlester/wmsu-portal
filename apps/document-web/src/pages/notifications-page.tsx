import { PageContainer, ContentWrapper } from '@/components/layout/page-container'
import { DataTable } from '@/components/desk/data-table'
import { Button } from '@/components/ui/button'
import { useNotifications, useMarkNotificationRead, useMarkAllNotificationsRead } from '@/hooks/use-notifications'
import { formatDate } from '@/lib/utils'
import type { NotificationRecord } from '@/lib/api'
import { cn } from '@/lib/utils'

export function NotificationsPage() {
  const { data, isLoading, unread } = useNotifications()
  const markRead = useMarkNotificationRead()
  const markAll = useMarkAllNotificationsRead()

  return (
    <PageContainer
      title="Notifications"
      breadcrumb="Home / Notifications"
      description={`${unread} unread notification(s)`}
      action={
        unread > 0 ? (
          <Button variant="outline" onClick={() => markAll.mutate()} disabled={markAll.isPending}>
            Mark all as read
          </Button>
        ) : undefined
      }
    >
      <ContentWrapper>
        <DataTable<NotificationRecord>
          loading={isLoading}
          data={data?.notifications ?? []}
          keyExtractor={(n) => n.id}
          emptyMessage="No notifications"
          columns={[
            {
              key: 'status',
              header: '',
              className: 'w-8',
              render: (n) => (
                <span className={cn('inline-block h-2 w-2 rounded-full', n.isRead ? 'bg-muted' : 'bg-primary')} aria-hidden />
              ),
            },
            { key: 'title', header: 'Title', render: (n) => <span className={cn('font-medium', !n.isRead && 'text-primary')}>{n.title}</span> },
            { key: 'body', header: 'Message', render: (n) => <span className="text-muted-foreground">{n.body}</span> },
            { key: 'type', header: 'Type', render: (n) => <span className="capitalize">{n.type.replace(/_/g, ' ')}</span> },
            { key: 'createdAt', header: 'Date', render: (n) => formatDate(n.createdAt) },
            {
              key: 'actions',
              header: 'Action',
              render: (n) =>
                !n.isRead ? (
                  <Button size="sm" variant="ghost" onClick={() => markRead.mutate(n.id)}>Mark read</Button>
                ) : (
                  <span className="text-xs text-muted-foreground">Read</span>
                ),
            },
          ]}
        />
      </ContentWrapper>
    </PageContainer>
  )
}
