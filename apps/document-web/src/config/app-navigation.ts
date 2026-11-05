import type { LucideIcon } from 'lucide-react'
import {
  LayoutDashboard,
  FileText,
  CheckSquare,
  GitBranch,
  BarChart3,
  Bell,
  ClipboardList,
  Settings,
  PlusCircle,
  Users,
  ArchiveRestore,
  ScanLine,
  Inbox,
  Archive,
  FolderTree,
  ListChecks,
  Hourglass,
} from 'lucide-react'
import { PERMISSIONS } from '@/shared/constants/env'
import type { NavGroup } from '@/components/desk-app/layout'

export interface AppNavItemDef {
  to: string
  label: string
  icon: LucideIcon
  /** Omit for items available to every authenticated tenant user */
  permission?: string
  /** Restrict to Tenant Owner / Admin / Super Admin */
  adminOnly?: boolean
}

export interface AppNavGroupDef {
  label: string
  items: AppNavItemDef[]
}

/**
 * Business-oriented sidebar: Overview → Intake → Workspace → Records → Operations → Admin.
 * Mirrors UDMS desk flow (receive/digitize → work documents → retain/archive → govern).
 */
const APP_NAV_GROUPS: AppNavGroupDef[] = [
  {
    label: 'Overview',
    items: [{ to: '/app/dashboard', label: 'Dashboard', icon: LayoutDashboard }],
  },
  {
    label: 'Intake',
    items: [
      {
        to: '/app/records/receiving',
        label: 'Receiving Desk',
        icon: Inbox,
        permission: PERMISSIONS.recordsReceivingManage,
      },
      {
        to: '/app/records/digitization',
        label: 'Digitization',
        icon: ScanLine,
        permission: PERMISSIONS.recordsDigitizationManage,
      },
      {
        to: '/app/documents/create',
        label: 'Register Document',
        icon: PlusCircle,
        permission: PERMISSIONS.documentsCreate,
      },
    ],
  },
  {
    label: 'Workspace',
    items: [
      {
        to: '/app/documents',
        label: 'Document Repository',
        icon: FileText,
        permission: PERMISSIONS.documentsView,
      },
      {
        to: '/app/documents/file-plan',
        label: 'File Plan',
        icon: FolderTree,
        permission: PERMISSIONS.documentsView,
      },
      {
        to: '/app/my-work',
        label: 'My Work',
        icon: ListChecks,
        permission: PERMISSIONS.documentsView,
      },
      {
        to: '/app/documents/platform',
        label: 'Platform Documents',
        icon: FileText,
        adminOnly: true,
      },
      { to: '/app/approvals', label: 'Approvals', icon: CheckSquare, permission: PERMISSIONS.documentsApprove },
      {
        to: '/app/records/requests',
        label: 'Record Requests',
        icon: ArchiveRestore,
        permission: PERMISSIONS.recordsRequestCreate,
      },
    ],
  },
  {
    label: 'Records Center',
    items: [
      {
        to: '/app/lifecycle',
        label: 'Lifecycle & Retention',
        icon: Hourglass,
        permission: PERMISSIONS.documentsView,
      },
      {
        to: '/app/records/archives',
        label: 'Archives',
        icon: Archive,
        permission: PERMISSIONS.recordsArchivesManage,
      },
    ],
  },
  {
    label: 'Operations',
    items: [
      { to: '/app/workflows', label: 'Workflows', icon: GitBranch, permission: PERMISSIONS.workflowsManage },
      { to: '/app/reports', label: 'Reports', icon: BarChart3, permission: PERMISSIONS.reportsView },
    ],
  },
  {
    label: 'Administration',
    items: [
      {
        to: '/app/notifications',
        label: 'Notifications',
        icon: Bell,
        permission: PERMISSIONS.documentsCreate,
      },
      { to: '/app/audit-logs', label: 'Audit Logs', icon: ClipboardList, permission: PERMISSIONS.auditView },
      { to: '/app/team', label: 'Team', icon: Users, permission: PERMISSIONS.usersManage },
      { to: '/app/settings', label: 'Settings', icon: Settings, permission: PERMISSIONS.settingsManage },
    ],
  },
]

const MOBILE_NAV_ITEMS: AppNavItemDef[] = [
  { to: '/app/dashboard', label: 'Home', icon: LayoutDashboard },
  { to: '/app/documents', label: 'Docs', icon: FileText, permission: PERMISSIONS.documentsView },
  { to: '/app/records/receiving', label: 'Receive', icon: Inbox, permission: PERMISSIONS.recordsReceivingManage },
  { to: '/app/approvals', label: 'Approve', icon: CheckSquare, permission: PERMISSIONS.documentsApprove },
  { to: '/app/notifications', label: 'Alerts', icon: Bell, permission: PERMISSIONS.documentsCreate },
]

export function canAccessNavItem(
  item: AppNavItemDef,
  permissions: string[],
  isSuperAdmin = false,
  isAdmin = false
): boolean {
  if (item.adminOnly) {
    return isSuperAdmin || isAdmin
  }
  if (!item.permission) return true
  if (isSuperAdmin) return true
  return permissions.includes(item.permission)
}

export function buildAppNavGroups(
  permissions: string[],
  options?: { unread?: number; isSuperAdmin?: boolean; isAdmin?: boolean }
): NavGroup[] {
  const { unread = 0, isSuperAdmin = false, isAdmin = false } = options ?? {}

  return APP_NAV_GROUPS.map((group) => ({
    label: group.label,
    items: group.items
      .filter((item) => canAccessNavItem(item, permissions, isSuperAdmin, isAdmin))
      .map((item) => ({
        ...item,
        badge: item.to === '/app/notifications' ? unread : undefined,
      })),
  })).filter((group) => group.items.length > 0)
}

export function buildMobileNavItems(
  permissions: string[],
  options?: { unread?: number; isSuperAdmin?: boolean; isAdmin?: boolean }
) {
  const { unread = 0, isSuperAdmin = false, isAdmin = false } = options ?? {}

  return MOBILE_NAV_ITEMS.filter((item) =>
    canAccessNavItem(item, permissions, isSuperAdmin, isAdmin)
  ).map((item) => ({
    ...item,
    badge: item.to === '/app/notifications' ? unread : undefined,
  }))
}
