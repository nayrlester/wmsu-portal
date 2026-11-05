import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export interface NotificationDropdownProps {
  open: boolean
  title?: string
  headerAction?: ReactNode
  footer?: ReactNode
  children: ReactNode
  className?: string
}

export function NotificationDropdown({
  open,
  title = 'Notifications',
  headerAction,
  footer,
  children,
  className,
}: NotificationDropdownProps) {
  if (!open) return null

  return (
    <div
      className={cn(
        'absolute right-0 top-full z-50 mt-2 w-80 rounded-lg border border-border bg-card shadow-xl sm:w-96',
        className
      )}
    >
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <h3 className="font-semibold">{title}</h3>
        {headerAction}
      </div>
      <div className="max-h-96 overflow-y-auto">{children}</div>
      {footer && <div className="border-t border-border p-2">{footer}</div>}
    </div>
  )
}
