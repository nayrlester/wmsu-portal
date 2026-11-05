import { Link, useLocation } from 'react-router-dom'
import type { LucideIcon } from 'lucide-react'
import { Shield } from 'lucide-react'
import { cn } from '@/lib/utils'
import { APP_LOGO_URL } from '@/shared/constants/branding'

export interface NavItem {
  to: string
  label: string
  icon: LucideIcon
  badge?: number
}

export interface NavGroup {
  label: string
  items: NavItem[]
}

export interface AppSidebarProps {
  items?: NavItem[]
  groups?: NavGroup[]
  brandName: string
  brandSubtitle?: string
  logoUrl?: string | null
  brandInitial?: string
  showAdminLink?: boolean
  adminLinkTo?: string
  adminLinkLabel?: string
  footer?: React.ReactNode
  collapsed?: boolean
  onNavigate?: () => void
  className?: string
}

function isNavItemActive(pathname: string, to: string, allPaths: string[]): boolean {
  if (pathname === to) return true
  if (to === '/app/dashboard') return false
  if (!pathname.startsWith(`${to}/`)) return false

  // Prefer the longest matching nav path so `/app/documents/platform`
  // does not also activate `/app/documents`.
  const longerMatch = allPaths.some(
    (other) =>
      other !== to &&
      other.length > to.length &&
      (pathname === other || pathname.startsWith(`${other}/`))
  )
  return !longerMatch
}

function NavLinkList({
  items,
  allPaths,
  location,
  collapsed,
  onNavigate,
}: {
  items: NavItem[]
  allPaths: string[]
  location: ReturnType<typeof useLocation>
  collapsed?: boolean
  onNavigate?: () => void
}) {
  return (
    <ul className="space-y-0.5">
      {items.map(({ to, label, icon: Icon, badge }) => {
        const active = isNavItemActive(location.pathname, to, allPaths)

        return (
          <li key={to}>
            <Link
              to={to}
              onClick={onNavigate}
              title={collapsed ? label : undefined}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'group flex items-center gap-2.5 rounded-xl px-3 py-2 text-[13px] font-medium transition-premium',
                active
                  ? 'bg-sidebar-active text-white'
                  : 'text-white/70 hover:bg-sidebar-hover hover:text-white',
                collapsed && 'justify-center px-2'
              )}
            >
              <Icon className="h-[18px] w-[18px] shrink-0" aria-hidden />
              {!collapsed && <span className="flex-1 truncate">{label}</span>}
              {!collapsed && badge !== undefined && badge > 0 && (
                <span className="rounded-full bg-white/15 px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-white">
                  {badge > 99 ? '99+' : badge}
                </span>
              )}
            </Link>
          </li>
        )
      })}
    </ul>
  )
}

export function AppSidebar({
  items = [],
  groups,
  brandName,
  brandSubtitle = 'University Documents Management System',
  logoUrl,
  showAdminLink,
  adminLinkTo = '/admin',
  adminLinkLabel = 'Admin Portal',
  footer,
  collapsed = false,
  onNavigate,
  className,
}: AppSidebarProps) {
  const location = useLocation()
  const resolvedLogoUrl = logoUrl || APP_LOGO_URL
  const navGroups = groups ?? (items.length ? [{ label: 'Menu', items }] : [])
  const allPaths = navGroups.flatMap((group) => group.items.map((item) => item.to))

  return (
    <aside
      className={cn(
        'sticky top-0 z-20 flex h-screen flex-col overflow-hidden bg-sidebar text-sidebar-foreground transition-[width] duration-200 ease-out',
        collapsed ? 'w-[72px]' : 'w-[260px]',
        className
      )}
      aria-label="Main navigation"
    >
      <div
        className={cn(
          'flex flex-col items-center px-5 pb-5 pt-8',
          collapsed && 'px-2 pt-6'
        )}
      >
        <div className={cn('flex items-center gap-3', collapsed && 'justify-center')}>
          <img
            src={resolvedLogoUrl}
            alt=""
            width={40}
            height={40}
            className="h-10 w-10 shrink-0 rounded-xl object-contain bg-[#0b1220] p-0.5 ring-2 ring-white/20"
            decoding="async"
          />
          {!collapsed && (
            <div className="min-w-0">
              <p className="truncate text-lg font-bold tracking-tight text-white">{brandName}</p>
              <p className="truncate text-[11px] text-white/50">{brandSubtitle}</p>
            </div>
          )}
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 pb-4">
        {navGroups.map((group, index) => (
          <div key={group.label} className={cn(index > 0 && 'mt-5')}>
            {!collapsed && (
              <p className="mb-1.5 px-3 text-[10px] font-medium uppercase tracking-[0.16em] text-white/40">
                {group.label}
              </p>
            )}
            <NavLinkList
              items={group.items}
              allPaths={allPaths}
              location={location}
              collapsed={collapsed}
              onNavigate={onNavigate}
            />
          </div>
        ))}

        {showAdminLink && (
          <>
            {!collapsed && (
              <p className="mb-1.5 mt-5 px-3 text-[10px] font-medium uppercase tracking-[0.16em] text-white/40">
                Platform
              </p>
            )}
            <Link
              to={adminLinkTo}
              onClick={onNavigate}
              title={collapsed ? adminLinkLabel : undefined}
              className={cn(
                'flex items-center gap-2.5 rounded-xl px-3 py-2 text-[13px] font-medium text-white/70 transition-premium hover:bg-sidebar-hover hover:text-white',
                collapsed && 'justify-center'
              )}
            >
              <Shield className="h-[18px] w-[18px] shrink-0" aria-hidden />
              {!collapsed && adminLinkLabel}
            </Link>
          </>
        )}
      </nav>

      {footer && !collapsed && (
        <div className="border-t border-white/10 px-5 py-4 text-[11px] text-white/45">{footer}</div>
      )}
    </aside>
  )
}
