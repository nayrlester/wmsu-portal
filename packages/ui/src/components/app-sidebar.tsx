import type { ReactNode } from 'react'
import { cn } from '../lib/utils'

export type NavItem = {
  id: string
  label: string
  href?: string
  icon?: ReactNode
  active?: boolean
  onClick?: () => void
  badge?: ReactNode
  section?: string
}

export type AppSidebarProps = {
  brand?: ReactNode
  items: NavItem[]
  footer?: ReactNode
  className?: string
  collapsed?: boolean
}

export function AppSidebar({ brand, items, footer, className, collapsed }: AppSidebarProps) {
  let lastSection: string | undefined

  return (
    <aside
      className={cn(
        'flex h-full flex-col bg-sidebar text-sidebar-foreground',
        collapsed ? 'w-[4.5rem]' : 'w-64',
        className
      )}
      style={{ backgroundColor: 'var(--color-sidebar, #2f2a6b)', color: 'var(--color-sidebar-foreground, #f7f7ff)' }}
      aria-label="Primary"
    >
      <div className={cn('border-b border-white/10 px-4 py-4', collapsed && 'px-2')}>
        {brand ?? (
          <div className="space-y-0.5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/70">WMSU CIS</p>
            {!collapsed ? <p className="text-sm font-semibold">Campus Information Systems</p> : null}
          </div>
        )}
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto px-2 py-3">
        {items.map((item) => {
          const showSection = Boolean(item.section && item.section !== lastSection && !collapsed)
          if (item.section) lastSection = item.section
          const content = (
            <>
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/15 text-white [&_svg]:h-4 [&_svg]:w-4 [&_svg]:stroke-[2] [&_svg]:stroke-current">
                {item.icon}
              </span>
              {!collapsed ? <span className="flex-1 truncate text-sm font-medium text-white">{item.label}</span> : null}
              {!collapsed ? item.badge : null}
            </>
          )
          const classNameItem = cn(
            'flex w-full items-center gap-2.5 rounded-xl px-2 py-1.5 text-left text-white transition-colors',
            item.active
              ? 'bg-sidebar-accent text-white shadow-sm'
              : 'hover:bg-white/10 hover:text-white'
          )
          return (
            <div key={item.id} className="space-y-1">
              {showSection ? (
                <p className="px-2 pb-1 pt-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/65">
                  {item.section}
                </p>
              ) : null}
              {item.href ? (
                <a href={item.href} className={classNameItem} aria-current={item.active ? 'page' : undefined}>
                  {content}
                </a>
              ) : (
                <button
                  type="button"
                  className={classNameItem}
                  onClick={item.onClick}
                  aria-current={item.active ? 'page' : undefined}
                >
                  {content}
                </button>
              )}
            </div>
          )
        })}
      </nav>
      {footer ? <div className="border-t border-white/10 p-3">{footer}</div> : null}
    </aside>
  )
}
