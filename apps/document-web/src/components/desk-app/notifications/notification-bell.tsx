import { Bell } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export interface NotificationBellProps {
  unreadCount?: number
  open?: boolean
  onClick?: () => void
  className?: string
}

export function NotificationBell({ unreadCount = 0, open, onClick, className }: NotificationBellProps) {
  return (
    <Button
      variant="ghost"
      size="icon"
      className={cn('relative', className)}
      aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ''}`}
      aria-expanded={open}
      onClick={onClick}
    >
      <Bell className="h-5 w-5" />
      {unreadCount > 0 && (
        <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-white">
          {unreadCount > 9 ? '9+' : unreadCount}
        </span>
      )}
    </Button>
  )
}
