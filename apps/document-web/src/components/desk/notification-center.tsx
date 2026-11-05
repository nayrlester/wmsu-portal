import { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  NotificationBell,
  NotificationDropdown,
  NotificationItem,
} from '@/components/desk-app/notifications'
import { useNotifications, useMarkNotificationRead, useMarkAllNotificationsRead } from '@/hooks/use-notifications'

export function NotificationCenter() {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const { data, unread } = useNotifications()
  const markRead = useMarkNotificationRead()
  const markAll = useMarkAllNotificationsRead()

  useEffect(() => {
    const handler = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div ref={ref} className="relative">
      <NotificationBell
        unreadCount={unread}
        open={open}
        onClick={() => setOpen((value) => !value)}
      />

      <NotificationDropdown
        open={open}
        headerAction={
          unread > 0 ? (
            <button
              type="button"
              className="text-xs text-primary hover:underline"
              onClick={() => markAll.mutate()}
            >
              Mark all read
            </button>
          ) : undefined
        }
        footer={
          <Link
            to="/app/notifications"
            className="block rounded-md py-2 text-center text-sm font-medium text-primary hover:bg-muted/50"
            onClick={() => setOpen(false)}
          >
            View all notifications
          </Link>
        }
      >
        {!data?.notifications.length ? (
          <p className="p-4 text-sm text-muted-foreground">No notifications yet.</p>
        ) : (
          <ul className="divide-y divide-border">
            {data.notifications.slice(0, 10).map((notification) => (
              <li key={notification.id}>
                <NotificationItem
                  notification={notification}
                  onClick={() => {
                    if (!notification.isRead) markRead.mutate(notification.id)
                  }}
                />
              </li>
            ))}
          </ul>
        )}
      </NotificationDropdown>
    </div>
  )
}
