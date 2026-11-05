import { describe, expect, it } from 'vitest'
import { buildAppNavGroups } from '@/config/app-navigation'
import { PERMISSIONS } from '@/shared/constants/env'

function navLabels(permissions: string[]) {
  return buildAppNavGroups(permissions)
    .flatMap((group) => group.items.map((item) => item.label))
}

function navGroupLabels(permissions: string[]) {
  return buildAppNavGroups(permissions).map((group) => group.label)
}

const OWNER_PERMISSIONS = Object.values(PERMISSIONS)

const ADMIN_PERMISSIONS = [
  PERMISSIONS.documentsView,
  PERMISSIONS.documentsCreate,
  PERMISSIONS.documentsUpdate,
  PERMISSIONS.documentsApprove,
  PERMISSIONS.workflowsManage,
  PERMISSIONS.reportsView,
  PERMISSIONS.usersManage,
  PERMISSIONS.auditView,
  PERMISSIONS.settingsManage,
]

describe('buildAppNavGroups', () => {
  it('uses business-oriented group order for tenant owner', () => {
    expect(navGroupLabels(OWNER_PERMISSIONS)).toEqual([
      'Overview',
      'Intake',
      'Workspace',
      'Records Center',
      'Operations',
      'Administration',
    ])
    expect(navLabels(OWNER_PERMISSIONS)).toEqual([
      'Dashboard',
      'Receiving Desk',
      'Digitization',
      'Register Document',
      'Document Repository',
      'File Plan',
      'My Work',
      'Approvals',
      'Record Requests',
      'Lifecycle & Retention',
      'Archives',
      'Workflows',
      'Reports',
      'Notifications',
      'Audit Logs',
      'Team',
      'Settings',
    ])
  })

  it('limits admin menu to intake create, workspace, ops, and admin', () => {
    expect(navLabels(ADMIN_PERMISSIONS)).toEqual([
      'Dashboard',
      'Register Document',
      'Document Repository',
      'File Plan',
      'My Work',
      'Approvals',
      'Lifecycle & Retention',
      'Workflows',
      'Reports',
      'Notifications',
      'Audit Logs',
      'Team',
      'Settings',
    ])
  })

  it('limits manager menu to document review and audit actions', () => {
    const labels = navLabels([
      PERMISSIONS.documentsView,
      PERMISSIONS.documentsCreate,
      PERMISSIONS.documentsUpdate,
      PERMISSIONS.documentsApprove,
      PERMISSIONS.auditView,
    ])
    expect(labels).toEqual([
      'Dashboard',
      'Register Document',
      'Document Repository',
      'File Plan',
      'My Work',
      'Approvals',
      'Lifecycle & Retention',
      'Notifications',
      'Audit Logs',
    ])
  })

  it('limits approver menu to review, edit, and audit actions', () => {
    const labels = navLabels([
      PERMISSIONS.documentsView,
      PERMISSIONS.documentsCreate,
      PERMISSIONS.documentsUpdate,
      PERMISSIONS.documentsApprove,
      PERMISSIONS.auditView,
    ])
    expect(labels).toEqual([
      'Dashboard',
      'Register Document',
      'Document Repository',
      'File Plan',
      'My Work',
      'Approvals',
      'Lifecycle & Retention',
      'Notifications',
      'Audit Logs',
    ])
  })

  it('limits member menu to document editing and audit logs', () => {
    const labels = navLabels([
      PERMISSIONS.documentsView,
      PERMISSIONS.documentsCreate,
      PERMISSIONS.documentsUpdate,
      PERMISSIONS.auditView,
    ])
    expect(labels).toEqual([
      'Dashboard',
      'Register Document',
      'Document Repository',
      'File Plan',
      'My Work',
      'Lifecycle & Retention',
      'Notifications',
      'Audit Logs',
    ])
  })

  it('limits user menu to read-only document access', () => {
    const labels = navLabels([PERMISSIONS.documentsView])
    expect(labels).toEqual([
      'Dashboard',
      'Document Repository',
      'File Plan',
      'My Work',
      'Lifecycle & Retention',
    ])
  })

  it('shows record requests when create permission is granted', () => {
    const labels = navLabels([PERMISSIONS.documentsView, PERMISSIONS.recordsRequestCreate])
    expect(labels).toEqual([
      'Dashboard',
      'Document Repository',
      'File Plan',
      'My Work',
      'Record Requests',
      'Lifecycle & Retention',
    ])
  })

  it('shows platform documents for admin role option', () => {
    const labels = buildAppNavGroups([PERMISSIONS.documentsView], { isAdmin: true })
      .flatMap((group) => group.items.map((item) => item.label))
    expect(labels).toEqual([
      'Dashboard',
      'Document Repository',
      'File Plan',
      'My Work',
      'Platform Documents',
      'Lifecycle & Retention',
    ])
  })

  it('hides platform documents from non-admin viewers', () => {
    const labels = navLabels([PERMISSIONS.documentsView])
    expect(labels).toEqual([
      'Dashboard',
      'Document Repository',
      'File Plan',
      'My Work',
      'Lifecycle & Retention',
    ])
  })
})
