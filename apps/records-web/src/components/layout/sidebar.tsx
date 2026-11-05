import { NavLink } from 'react-router-dom'
import {
  Building2,
  ClipboardList,
  LayoutDashboard,
  Package,
  Shield,
  Users,
  Warehouse,
  X,
  ArrowLeftRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import uimsLogo from '@/assets/UIMS-Icon.png'

const navGroups = [
  {
    label: 'Overview',
    items: [
      { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    ],
  },
  {
    label: 'Inventory',
    items: [
      { to: '/items', label: 'Items', icon: Package },
      { to: '/warehouses', label: 'Warehouses', icon: Warehouse },
      { to: '/stock', label: 'Stock', icon: ArrowLeftRight },
    ],
  },
  {
    label: 'Asset Management',
    items: [
      { to: '/assets', label: 'Assets', icon: ClipboardList },
    ],
  },
  {
    label: 'Organization',
    items: [
      { to: '/organization', label: 'Org Structure', icon: Building2 },
      { to: '/users', label: 'Users', icon: Users },
      { to: '/roles', label: 'Roles', icon: Shield },
    ],
  },
]

function NavContent() {
  return (
    <div className="flex h-full flex-col">
      <div className="flex h-14 items-center gap-2.5 px-4">
        <img
          src={uimsLogo}
          alt=""
          className="h-9 w-9 shrink-0 object-contain"
        />
        <span className="truncate text-sm font-bold tracking-tight text-white">UIMS</span>
      </div>

      <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-4">
        {navGroups.map((group) => (
          <div key={group.label}>
            <div className="uims-group-label">{group.label}</div>
            <ul className="space-y-0.5">
              {group.items.map((item) => (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    className={({ isActive }) =>
                      cn('uims-nav-item', isActive && 'uims-nav-active')
                    }
                  >
                    <item.icon className="h-4 w-4 shrink-0" />
                    <span>{item.label}</span>
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      <div className="border-t border-white/10 px-5 py-3">
        <p className="text-[10px] text-white/30">University Inventory v0.1</p>
      </div>
    </div>
  )
}

export function Sidebar({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  return (
    <>
      {/* Desktop */}
      <aside className="uims-sidebar hidden w-60 shrink-0 lg:block">
        <NavContent />
      </aside>

      {/* Mobile overlay */}
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-slate-900/50"
            onClick={onClose}
          />
          <aside className="uims-sidebar relative w-64 h-full">
            <button
              type="button"
              onClick={onClose}
              className="absolute right-3 top-3 rounded-lg p-1.5 text-white/60 hover:bg-white/10 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
            <NavContent />
          </aside>
        </div>
      )}
    </>
  )
}
