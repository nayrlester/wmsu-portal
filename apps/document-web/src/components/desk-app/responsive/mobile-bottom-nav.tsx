import { Link, useLocation } from 'react-router-dom'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface BottomNavItem {
  to: string
  label: string
  icon: LucideIcon
  badge?: number
}

export interface MobileBottomNavProps {
  items: BottomNavItem[]
  className?: string
}

export function MobileBottomNav({ items, className }: MobileBottomNavProps) {
  const location = useLocation()
  const allPaths = items.map((item) => item.to)

  return (
    <nav
      className={cn(
        'fixed inset-x-0 bottom-0 z-40 border-t border-border bg-desk-header/95 backdrop-blur lg:hidden',
        className
      )}
      aria-label="Mobile navigation"
    >
      <ul className="mx-auto flex max-w-lg items-stretch justify-around px-2 pb-[env(safe-area-inset-bottom)]">
        {items.map(({ to, label, icon: Icon, badge }) => {
          const exact = location.pathname === to
          const under = location.pathname.startsWith(`${to}/`)
          const longerMatch = allPaths.some(
            (other) =>
              other !== to &&
              other.length > to.length &&
              (location.pathname === other || location.pathname.startsWith(`${other}/`))
          )
          const active = exact || (under && !longerMatch)
          return (
            <li key={to} className="flex-1">
              <Link
                to={to}
                className={cn(
                  'relative flex flex-col items-center gap-1 px-2 py-2.5 text-[10px] font-medium transition-colors',
                  active ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
                )}
                aria-current={active ? 'page' : undefined}
              >
                <Icon className="h-5 w-5" aria-hidden />
                <span>{label}</span>
                {badge !== undefined && badge > 0 && (
                  <span className="absolute right-2 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[9px] font-bold text-white">
                    {badge > 9 ? '9+' : badge}
                  </span>
                )}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
