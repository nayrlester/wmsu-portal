import { NavLink } from 'react-router-dom'
import type { LucideIcon } from 'lucide-react'
import {
  LayoutDashboard,
  Users,
  Settings,
  BookOpen,
  Contact,
  ArrowLeftRight,
  Search,
  ScrollText,
  Bookmark,
  FileBarChart,
  Globe,
  UserRound,
  HardDrive,
  MonitorSmartphone,
  ClipboardList,
  LogOut,
  Plug,
  ShoppingCart,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { WmsuLogo } from '@/components/brand/wmsu-logo'
import { useAuthStore } from '@/stores/auth-store'
import { getAppName } from '@/lib/deployment'
import { logout } from '@/lib/auth-api'
import { isStudentLimitedAccess } from '@/lib/student-access'
import { redirectToPortalLogout } from '@/lib/portal'

type NavItem = {
  to: string
  label: string
  icon: LucideIcon
  permission?: string
}

type NavSection = {
  id: string
  label: string
  items: NavItem[]
}

const navSections: NavSection[] = [
  {
    id: 'overview',
    label: 'Overview',
    items: [{ to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard }],
  },
  {
    id: 'catalog',
    label: 'Catalog',
    items: [
      { to: '/books', label: 'Catalog', icon: BookOpen, permission: 'books:read' },
      { to: '/digital', label: 'Digital library', icon: HardDrive, permission: 'digital:read' },
      { to: '/search', label: 'Advanced search', icon: Search, permission: 'search:query' },
      { to: '/opac', label: 'Staff OPAC', icon: Globe, permission: 'search:query' },
    ],
  },
  {
    id: 'operations',
    label: 'Operations',
    items: [
      { to: '/circulation', label: 'Circulation desk', icon: ArrowLeftRight, permission: 'borrowings:read' },
      { to: '/acquisitions', label: 'Acquisitions', icon: ShoppingCart, permission: 'acquisitions:read' },
      { to: '/reservations', label: 'Holds & reservations', icon: Bookmark, permission: 'reservations:read' },
      { to: '/kiosk-platform', label: 'Kiosk platform', icon: MonitorSmartphone, permission: 'settings:read' },
    ],
  },
  {
    id: 'patrons',
    label: 'Patrons',
    items: [
      { to: '/members', label: 'Members', icon: Contact, permission: 'members:read' },
      { to: '/attendance', label: 'Attendance', icon: ClipboardList, permission: 'members:read' },
      { to: '/portal', label: 'My Library', icon: UserRound },
    ],
  },
  {
    id: 'insights',
    label: 'Insights',
    items: [
      { to: '/reports', label: 'Reports', icon: FileBarChart, permission: 'reports:export' },
      { to: '/audit-logs', label: 'Audit logs', icon: ScrollText, permission: 'audit:read' },
    ],
  },
]

const adminNav: NavItem[] = [
  { to: '/users', label: 'Staff users', icon: Users, permission: 'users:read' },
  { to: '/integrations', label: 'Integrations', icon: Plug, permission: 'settings:read' },
  { to: '/settings', label: 'Institution settings', icon: Settings, permission: 'settings:read' },
]

function filterItems(items: NavItem[], permissions: string[] | undefined) {
  return items.filter((item) => !item.permission || permissions?.includes(item.permission))
}

function NavItemLink({ to, label, icon: Icon }: NavItem) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cn(
          'group flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors',
          isActive
            ? 'bg-white/14 text-white'
            : 'text-white/70 hover:bg-white/8 hover:text-white'
        )
      }
    >
      <Icon className="h-[17px] w-[17px] shrink-0 opacity-90" />
      <span className="truncate">{label}</span>
    </NavLink>
  )
}

const studentNavSections: NavSection[] = [
  {
    id: 'patron',
    label: 'My account',
    items: [
      { to: '/portal', label: 'My Library', icon: UserRound },
      { to: '/digital', label: 'Digital library', icon: HardDrive, permission: 'digital:read' },
      { to: '/search', label: 'Search catalog', icon: Search, permission: 'search:query' },
      { to: '/opac', label: 'OPAC browse', icon: Globe, permission: 'search:query' },
    ],
  },
]

export function AppSidebar() {
  const tenant = useAuthStore((s) => s.tenant)
  const user = useAuthStore((s) => s.user)
  const tokens = useAuthStore((s) => s.tokens)
  const logoutStore = useAuthStore((s) => s.logout)
  const studentLimited = isStudentLimitedAccess(user)

  const sections = (studentLimited ? studentNavSections : navSections)
    .map((section) => ({
      ...section,
      items: filterItems(section.items, user?.permissions),
    }))
    .filter((section) => section.items.length > 0)

  const visibleAdmin = studentLimited ? [] : filterItems(adminNav, user?.permissions)

  async function handleLogout() {
    try {
      if (tokens?.refreshToken) await logout(tokens.refreshToken)
    } finally {
      logoutStore()
      redirectToPortalLogout()
    }
  }

  return (
    <aside className="sticky top-0 z-20 flex h-screen w-[260px] shrink-0 flex-col overflow-hidden bg-[var(--color-sidebar)] text-[var(--color-sidebar-foreground)]">
      <div className="flex flex-col items-center px-5 pb-5 pt-6 sm:pt-8">
        <WmsuLogo productName="WMSU" productTagline="University Library" variant="sidebar" invert className="w-full max-w-[220px]" />
        <p className="mt-3 line-clamp-2 text-center text-sm font-semibold leading-snug">
          {tenant?.name ?? getAppName()}
        </p>
        <p className="mt-1 text-xs text-white/55">
          {user?.fullName?.split(' ')[0] ?? 'Staff'} · Staff
        </p>
      </div>

      <nav className="flex-1 space-y-5 overflow-y-auto px-3 pb-3">
        {sections.map((section) => (
          <div key={section.id}>
            <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/40">
              {section.label}
            </p>
            <div className="space-y-0.5">
              {section.items.map((item) => (
                <NavItemLink key={item.to} {...item} />
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className="mt-auto space-y-0.5 border-t border-white/10 px-3 py-4">
        {visibleAdmin.length > 0 && (
          <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/40">
            Administration
          </p>
        )}
        {visibleAdmin.map((item) => (
          <NavItemLink key={item.to} {...item} />
        ))}
        <button
          type="button"
          onClick={() => void handleLogout()}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm font-medium text-white/70 transition-colors hover:bg-white/8 hover:text-white"
        >
          <LogOut className="h-[17px] w-[17px] shrink-0" />
          Log out
        </button>
      </div>
    </aside>
  )
}
