import { DefaultRoleSlug } from '#modules/documents/domain/enums/index'

/** Global permission catalog used by seeders and tenant provisioning. */
export const SYSTEM_PERMISSION_DEFINITIONS = [
  { name: 'View Documents', slug: 'documents.view', module: 'documents' },
  { name: 'Create Documents', slug: 'documents.create', module: 'documents' },
  { name: 'Update Documents', slug: 'documents.update', module: 'documents' },
  { name: 'Delete Documents', slug: 'documents.delete', module: 'documents' },
  { name: 'Download Documents', slug: 'documents.download', module: 'documents' },
  { name: 'Approve Documents', slug: 'documents.approve', module: 'documents' },
  { name: 'E-Sign Documents', slug: 'documents.esign', module: 'documents' },
  { name: 'Manage Workflows', slug: 'workflows.manage', module: 'workflows' },
  { name: 'Manage Users', slug: 'users.manage', module: 'users' },
  { name: 'Manage Roles', slug: 'roles.manage', module: 'roles' },
  { name: 'View Reports', slug: 'reports.view', module: 'reports' },
  { name: 'Manage Billing', slug: 'billing.manage', module: 'billing' },
  { name: 'View Audit Logs', slug: 'audit.view', module: 'audit' },
  { name: 'Manage Settings', slug: 'settings.manage', module: 'settings' },
  { name: 'Manage Retention Schedules', slug: 'records.retention.manage', module: 'records' },
  { name: 'View Restricted Records', slug: 'records.restricted.view', module: 'records' },
  { name: 'Download Restricted Records', slug: 'records.restricted.download', module: 'records' },
  { name: 'Create Records Requests', slug: 'records.request.create', module: 'records' },
  { name: 'Manage Records Release Desk', slug: 'records.release.manage', module: 'records' },
  { name: 'Manage Digitization Batches', slug: 'records.digitization.manage', module: 'records' },
  { name: 'Manage Receiving Desk', slug: 'records.receiving.manage', module: 'records' },
  { name: 'Manage Archives & Disposal', slug: 'records.archives.manage', module: 'records' },
] as const

/**
 * Least-privilege defaults for system roles.
 * Records desks / UDMS manage grants are Owner-only until assigned in Roles settings.
 * Keep in sync with `api/tests/functional/rbac.spec.ts` and web nav filtering tests.
 */
export const SYSTEM_ROLE_PERMISSION_SLUGS: Record<string, readonly string[] | '*'> = {
  [DefaultRoleSlug.TENANT_OWNER]: '*',
  [DefaultRoleSlug.ADMIN]: [
    'documents.view',
    'documents.create',
    'documents.update',
    'documents.delete',
    'documents.download',
    'documents.approve',
    'documents.esign',
    'workflows.manage',
    'reports.view',
    'users.manage',
    'audit.view',
    'settings.manage',
  ],
  [DefaultRoleSlug.MANAGER]: [
    'documents.view',
    'documents.create',
    'documents.update',
    'documents.download',
    'documents.approve',
    'reports.view',
    'audit.view',
  ],
  [DefaultRoleSlug.APPROVER]: [
    'documents.view',
    'documents.create',
    'documents.update',
    'documents.download',
    'documents.approve',
    'audit.view',
  ],
  [DefaultRoleSlug.STAFF]: [
    'documents.view',
    'documents.create',
    'documents.update',
    'documents.download',
    'audit.view',
  ],
  [DefaultRoleSlug.VIEWER]: ['documents.view'],
}

export const SYSTEM_ROLE_DEFINITIONS = [
  { slug: DefaultRoleSlug.TENANT_OWNER, name: 'Tenant Owner' },
  { slug: DefaultRoleSlug.ADMIN, name: 'Admin' },
  { slug: DefaultRoleSlug.MANAGER, name: 'Manager' },
  { slug: DefaultRoleSlug.APPROVER, name: 'Approver' },
  { slug: DefaultRoleSlug.STAFF, name: 'Member' },
  { slug: DefaultRoleSlug.VIEWER, name: 'User' },
] as const

export function resolveRolePermissionSlugs(
  roleSlug: string,
  allPermissionSlugs: string[]
): string[] {
  const configured = SYSTEM_ROLE_PERMISSION_SLUGS[roleSlug]
  if (configured === '*') return [...allPermissionSlugs]
  return configured ? [...configured] : []
}
