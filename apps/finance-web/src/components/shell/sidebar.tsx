import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  Building2,
  FileSpreadsheet,
  Users,
  Shield,
  Wallet,
  BookOpen,
  GraduationCap,
  ShoppingCart,
  Store,
  Banknote,
  FileText,
  Settings,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { WmsuLogo } from '@/components/brand/wmsu-logo'

const navGroups = [
  {
    label: 'Main',
    items: [{ to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' }],
  },
  {
    label: 'Finance',
    items: [
      { to: '/budget', icon: Wallet, label: 'Budget' },
      { to: '/accounting', icon: BookOpen, label: 'Accounting' },
      { to: '/tuition', icon: GraduationCap, label: 'Tuition & plans' },
      { to: '/cashier', icon: Banknote, label: 'Cashier & AR' },
      { to: '/disbursement', icon: FileText, label: 'AP & Disbursement' },
      { to: '/procurement', icon: ShoppingCart, label: 'Procurement' },
      { to: '/pos', icon: Store, label: 'POS' },
    ],
  },
  {
    label: 'Reports',
    items: [{ to: '/reports', icon: FileSpreadsheet, label: 'Reports' }],
  },
  {
    label: 'Settings',
    items: [
      { to: '/config', icon: Settings, label: 'Finance Config' },
      { to: '/organization', icon: Building2, label: 'Organization' },
      { to: '/users', icon: Users, label: 'Users' },
      { to: '/roles', icon: Shield, label: 'Roles' },
    ],
  },
] as const

interface SidebarProps {
  onClose: () => void
}

export function Sidebar({ onClose }: SidebarProps) {
  return (
    <div className="uims-sidebar flex h-full flex-col text-[var(--color-sidebar-foreground)]">
      <div className="flex h-16 items-center justify-between gap-2 px-4 pt-2">
        <WmsuLogo productName="UFMS" productTagline="Finance" variant="sidebar" invert />
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
        {navGroups.map((group) => (
          <div key={group.label} className="mb-5">
            <div className="uims-group-label">{group.label}</div>
            <ul className="space-y-0.5">
              {group.items.map((item) => (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    onClick={onClose}
                    className={({ isActive }) => cn('uims-nav-item', isActive && 'uims-nav-active')}
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
        <p className="text-[10px] text-white/30">WMSU · UFMS</p>
      </div>
    </div>
  )
}
