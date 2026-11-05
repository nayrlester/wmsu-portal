import { cn, formatDate } from '@/lib/utils'

export interface NotificationItemData {
  id: string
  title: string
  body: string
  createdAt: string
  isRead?: boolean
}

export interface NotificationItemProps {
  notification: NotificationItemData
  onClick?: () => void
  className?: string
}

export function NotificationItem({ notification, onClick, className }: NotificationItemProps) {
  return (
    <button
      type="button"
      className={cn(
        'w-full px-4 py-3 text-left hover:bg-muted/40',
        !notification.isRead && 'bg-primary/5',
        className
      )}
      onClick={onClick}
    >
      <p className="text-sm font-medium">{notification.title}</p>
      <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{notification.body}</p>
      <p className="mt-1 text-[10px] text-muted-foreground">{formatDate(notification.createdAt)}</p>
    </button>
  )
}
