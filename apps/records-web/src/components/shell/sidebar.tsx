import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  FileText,
  ScrollText,
  GraduationCap,
  Settings,
  Shield,
  Users,
  Building2,
  BarChart3,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { WmsuLogo } from '@/components/brand/wmsu-logo'
import { useAuthStore } from '@/stores/auth-store'
import { canViewTormsDashboard, hasPermission } from '@/lib/permissions'

const navGroups = [
  {
    label: 'Main',
    items: [
      { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
      { to: '/reports', icon: BarChart3, label: 'Reports' },
    ],
  },
  {
    label: 'Records',
    items: [
      { to: '/tor', icon: ScrollText, label: 'Transcript Requests' },
      { to: '/certifications', icon: FileText, label: 'Certifications' },
      { to: '/alumni', icon: GraduationCap, label: 'Alumni' },
    ],
  },
  {
    label: 'Settings',
    items: [
      { to: '/organization', icon: Building2, label: 'Organization' },
      { to: '/users', icon: Users, label: 'Users' },
      { to: '/roles', icon: Shield, label: 'Roles' },
      { to: '/foundation', icon: Settings, label: 'Foundation' },
    ],
  },
] as const

interface SidebarProps {
  onClose: () => void
}

export function Sidebar({ onClose }: SidebarProps) {
  const permissions = useAuthStore((s) => s.user?.permissions ?? [])

  const visibleGroups = navGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => {
        if (item.to === '/dashboard') return canViewTormsDashboard(permissions)
        if (item.to === '/reports') return hasPermission(permissions, 'torms.reports.read')
        if (item.to === '/tor') {
          return (
            hasPermission(permissions, 'torms.requests.read') ||
            hasPermission(permissions, 'torms.requests.write')
          )
        }
        if (item.to === '/certifications') {
          return hasPermission(permissions, 'torms.requests.read')
        }
        if (item.to === '/alumni') {
          return (
            hasPermission(permissions, 'torms.alumni.read') || hasPermission(permissions, 'torms.alumni.write')
          )
        }
        return true
      }),
    }))
    .filter((group) => group.items.length > 0)

  return (
    <div className="uims-sidebar flex h-full flex-col text-[var(--color-sidebar-foreground)]">
      <div className="flex h-16 items-center justify-between gap-2 px-4 pt-2">
        <WmsuLogo productName="TORMS" productTagline="Records & Alumni" variant="sidebar" invert />
        <button
          type="button"
          className="shrink-0 rounded-xl p-1.5 text-white/50 hover:bg-white/10 hover:text-white lg:hidden"
          onClick={onClose}
          aria-label="Close navigation"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-5">
        {visibleGroups.map((group) => (
          <div key={group.label} className="mb-5">
            <div className="uims-group-label">{group.label}</div>
            <ul className="space-y-0.5">
              {group.items.map((item) => (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    onClick={onClose}
                    className={({ isActive }) =>
                      cn('uims-nav-item', isActive && 'uims-nav-active')
                    }
                  >
                    <item.icon className="h-[17px] w-[17px] shrink-0 opacity-90" />
                    {item.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      <div className="border-t border-white/10 px-4 py-3">
        <p className="text-[10px] text-white/30">WMSU · TORMS</p>
      </div>
    </div>
  )
}
