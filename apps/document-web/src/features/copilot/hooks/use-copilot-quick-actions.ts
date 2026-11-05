import { useMemo } from 'react'
import { useLocation } from 'react-router-dom'
import { PERMISSIONS } from '@/shared/constants/env'
import { useAuthStore } from '@/stores/auth-store'
import type { CopilotQuickAction } from '@/features/copilot/types/copilot.types'

const BASE_ACTIONS: CopilotQuickAction[] = [
  { id: 'find', label: 'Find document', prompt: 'Find a document' },
  { id: 'create', label: 'Create document', prompt: 'Create a document', permission: PERMISSIONS.documentsCreate },
  { id: 'approvals', label: 'Pending approvals', prompt: 'Show pending approvals', permission: PERMISSIONS.documentsApprove },
  { id: 'report', label: 'Generate report', prompt: 'Generate report', permission: PERMISSIONS.reportsView },
  { id: 'workflow', label: 'Explain workflow', prompt: 'Explain workflow' },
  { id: 'audit', label: 'Audit logs', prompt: 'Search audit logs', permission: PERMISSIONS.auditView },
]

const PAGE_ACTIONS: Record<string, CopilotQuickAction[]> = {
  '/app/dashboard': [
    { id: 'metrics', label: 'Show metrics', prompt: 'Show dashboard metrics' },
    { id: 'pending', label: 'Pending approvals', prompt: 'Show pending approvals', permission: PERMISSIONS.documentsApprove },
  ],
  '/app/documents': [
    { id: 'create', label: 'Create document', prompt: 'Create a document', permission: PERMISSIONS.documentsCreate },
    { id: 'search', label: 'Search documents', prompt: 'Find a document' },
  ],
  '/app/reports': [
    { id: 'report', label: 'Generate report', prompt: 'Generate monthly approval report', permission: PERMISSIONS.reportsView },
  ],
  '/app/team': [
    { id: 'users', label: 'Manage users', prompt: 'Open team management', permission: PERMISSIONS.usersManage },
  ],
  '/app/audit-logs': [
    { id: 'audit', label: 'View audit logs', prompt: 'Search audit logs', permission: PERMISSIONS.auditView },
  ],
}

export function useCopilotQuickActions() {
  const location = useLocation()
  const hasPermission = useAuthStore((s) => s.hasPermission)

  return useMemo(() => {
    const pageKey = Object.keys(PAGE_ACTIONS).find((key) => location.pathname.startsWith(key))
    const actions = pageKey ? PAGE_ACTIONS[pageKey]! : BASE_ACTIONS
    return actions.filter((action) => !action.permission || hasPermission(action.permission))
  }, [location.pathname, hasPermission])
}
