import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import Role from '#modules/library/models/role'
import Permission from '#modules/library/models/permission'
import User from '#modules/library/models/user'

const PERMISSION_DEFINITIONS = [
  { code: 'books:read', resource: 'books', action: 'read', description: 'View books' },
  { code: 'books:create', resource: 'books', action: 'create', description: 'Create books' },
  { code: 'books:update', resource: 'books', action: 'update', description: 'Update books' },
  { code: 'books:delete', resource: 'books', action: 'delete', description: 'Delete books' },
  { code: 'members:read', resource: 'members', action: 'read', description: 'View members' },
  { code: 'members:create', resource: 'members', action: 'create', description: 'Create members' },
  { code: 'members:update', resource: 'members', action: 'update', description: 'Update members' },
  { code: 'members:delete', resource: 'members', action: 'delete', description: 'Delete members' },
  { code: 'members:approve', resource: 'members', action: 'approve', description: 'Approve memberships' },
  { code: 'users:read', resource: 'users', action: 'read', description: 'View users' },
  { code: 'users:create', resource: 'users', action: 'create', description: 'Invite users' },
  { code: 'users:update', resource: 'users', action: 'update', description: 'Update users' },
  { code: 'settings:read', resource: 'settings', action: 'read', description: 'View settings' },
  {
    code: 'settings:update',
    resource: 'settings',
    action: 'update',
    description: 'Update settings',
  },
  { code: 'audit:read', resource: 'audit', action: 'read', description: 'View audit logs' },
  {
    code: 'activity:read',
    resource: 'activity',
    action: 'read',
    description: 'View activity feed',
  },
  {
    code: 'borrowings:read',
    resource: 'borrowings',
    action: 'read',
    description: 'View borrowings',
  },
  {
    code: 'borrowings:request',
    resource: 'borrowings',
    action: 'request',
    description: 'Request to borrow books',
  },
  {
    code: 'borrowings:approve',
    resource: 'borrowings',
    action: 'approve',
    description: 'Approve borrow requests',
  },
  {
    code: 'borrowings:checkout',
    resource: 'borrowings',
    action: 'checkout',
    description: 'Check out books',
  },
  {
    code: 'borrowings:return',
    resource: 'borrowings',
    action: 'return',
    description: 'Process book returns',
  },
  {
    code: 'borrowings:mark_lost',
    resource: 'borrowings',
    action: 'mark_lost',
    description: 'Mark books as lost',
  },
  {
    code: 'borrowings:renew',
    resource: 'borrowings',
    action: 'renew',
    description: 'Renew borrowed books',
  },
  { code: 'fines:read', resource: 'fines', action: 'read', description: 'View fines' },
  {
    code: 'fines:collect',
    resource: 'fines',
    action: 'collect',
    description: 'Record fine payments',
  },
  { code: 'fines:waive', resource: 'fines', action: 'waive', description: 'Waive fines' },
  { code: 'fines:adjust', resource: 'fines', action: 'adjust', description: 'Adjust fine amounts' },
  {
    code: 'reservations:read',
    resource: 'reservations',
    action: 'read',
    description: 'View reservations',
  },
  {
    code: 'reservations:create',
    resource: 'reservations',
    action: 'create',
    description: 'Create reservations',
  },
  {
    code: 'reservations:cancel',
    resource: 'reservations',
    action: 'cancel',
    description: 'Cancel reservations',
  },
  {
    code: 'reservations:fulfill',
    resource: 'reservations',
    action: 'fulfill',
    description: 'Fulfill reservations',
  },
  { code: 'digital:read', resource: 'digital', action: 'read', description: 'View digital resources' },
  {
    code: 'digital:create',
    resource: 'digital',
    action: 'create',
    description: 'Create digital resources',
  },
  {
    code: 'digital:access',
    resource: 'digital',
    action: 'access',
    description: 'Access digital resources',
  },
  {
    code: 'digital:delete',
    resource: 'digital',
    action: 'delete',
    description: 'Delete digital resources',
  },
  { code: 'search:query', resource: 'search', action: 'query', description: 'Run search queries' },
  { code: 'ai:query', resource: 'ai', action: 'query', description: 'Use AI library assistant' },
  {
    code: 'analytics:read',
    resource: 'analytics',
    action: 'read',
    description: 'View analytics dashboard',
  },
  {
    code: 'reports:export',
    resource: 'reports',
    action: 'export',
    description: 'Export operational reports',
  },
  {
    code: 'audit:export',
    resource: 'audit',
    action: 'export',
    description: 'Export audit logs',
  },
  {
    code: 'acquisitions:read',
    resource: 'acquisitions',
    action: 'read',
    description: 'View acquisition requests (LIB-008)',
  },
  {
    code: 'acquisitions:create',
    resource: 'acquisitions',
    action: 'create',
    description: 'Create acquisition requests',
  },
  {
    code: 'acquisitions:update',
    resource: 'acquisitions',
    action: 'update',
    description: 'Edit draft acquisition requests',
  },
  {
    code: 'acquisitions:submit',
    resource: 'acquisitions',
    action: 'submit',
    description: 'Submit acquisition requests',
  },
  {
    code: 'acquisitions:route',
    resource: 'acquisitions',
    action: 'route',
    description: 'Route acquisition requests to UFMS procurement',
  },
  {
    code: 'acquisitions:catalog',
    resource: 'acquisitions',
    action: 'catalog',
    description: 'Link catalog records to acquisition requests',
  },
  {
    code: 'acquisitions:cancel',
    resource: 'acquisitions',
    action: 'cancel',
    description: 'Cancel draft or submitted acquisition requests',
  },
] as const

const PATRON_PERMISSIONS = [
  'books:read',
  'borrowings:read',
  'borrowings:request',
  'borrowings:renew',
  'fines:read',
  'reservations:read',
  'reservations:create',
  'reservations:cancel',
  'digital:read',
  'digital:access',
  'search:query',
  'acquisitions:read',
  'acquisitions:create',
  'acquisitions:submit',
  'acquisitions:cancel',
] as const

const ROLE_DEFINITIONS = [
  {
    code: 'admin',
    name: 'System Administrator',
    description: 'TOR system administrator — full ULMIS administration (LIB-019)',
    permissions: PERMISSION_DEFINITIONS.map((p) => p.code),
  },
  {
    code: 'librarian',
    name: 'Librarian',
    description: 'TOR librarian — library operations (LIB-019)',
    permissions: [
      'books:read',
      'books:create',
      'books:update',
      'books:delete',
      'members:read',
      'members:create',
      'members:update',
      'members:delete',
      'members:approve',
      'borrowings:read',
      'borrowings:approve',
      'borrowings:checkout',
      'borrowings:return',
      'borrowings:mark_lost',
      'borrowings:renew',
      'fines:read',
      'fines:collect',
      'fines:waive',
      'fines:adjust',
      'reservations:read',
      'reservations:create',
      'reservations:cancel',
      'reservations:fulfill',
      'acquisitions:read',
      'acquisitions:create',
      'acquisitions:update',
      'acquisitions:submit',
      'acquisitions:route',
      'acquisitions:catalog',
      'acquisitions:cancel',
      'digital:read',
      'digital:create',
      'digital:access',
      'search:query',
      'ai:query',
      'analytics:read',
      'reports:export',
      'users:read',
      'settings:read',
      'settings:update',
      'audit:read',
      'activity:read',
    ],
  },
  {
    code: 'staff',
    name: 'Library Staff',
    description: 'Limited circulation desk access (operational; not a TOR-named role)',
    permissions: [
      'books:read',
      'members:read',
      'members:create',
      'borrowings:read',
      'borrowings:request',
      'borrowings:checkout',
      'borrowings:return',
      'borrowings:renew',
      'fines:read',
      'fines:collect',
      'reservations:read',
      'reservations:create',
      'reservations:cancel',
      'acquisitions:read',
      'acquisitions:create',
      'acquisitions:update',
      'acquisitions:submit',
      'acquisitions:cancel',
      'digital:read',
      'digital:access',
      'search:query',
      'ai:query',
      'analytics:read',
      'users:read',
      'activity:read',
    ],
  },
  {
    code: 'faculty',
    name: 'Faculty',
    description: 'TOR faculty patron role (LIB-019)',
    permissions: [...PATRON_PERMISSIONS],
  },
  {
    code: 'student',
    name: 'Student',
    description: 'TOR student patron role (LIB-019)',
    permissions: [...PATRON_PERMISSIONS],
  },
  {
    code: 'member',
    name: 'Member',
    description: 'Legacy self-service patron alias (prefer student/faculty TOR roles)',
    permissions: [...PATRON_PERMISSIONS, 'ai:query'],
  },
] as const

export default class RbacService {
  async ensureGlobalPermissions(): Promise<Map<string, Permission>> {
    const map = new Map<string, Permission>()

    for (const def of PERMISSION_DEFINITIONS) {
      let permission = await Permission.findBy('code', def.code)
      if (!permission) {
        permission = await Permission.create(def)
      }
      map.set(def.code, permission)
    }

    return map
  }

  async seedTenantRoles(
    tenantId: string,
    trx?: TransactionClientContract
  ): Promise<void> {
    const permissionMap = await this.ensureGlobalPermissions()

    for (const roleDef of ROLE_DEFINITIONS) {
      const role = await Role.updateOrCreate(
        { tenantId, code: roleDef.code },
        {
          tenantId,
          code: roleDef.code,
          name: roleDef.name,
          description: roleDef.description,
          isSystem: true,
        },
        trx ? { client: trx } : undefined
      )

      const permissionIds = roleDef.permissions
        .map((code) => permissionMap.get(code)?.id)
        .filter(Boolean) as string[]

      if (permissionIds.length) {
        const bound = trx ? role.useTransaction(trx) : role
        await bound.related('permissions').sync(permissionIds)
      }
    }
  }

  async getUserRolesAndPermissions(
    userId: string,
    trx?: TransactionClientContract
  ): Promise<{ roles: string[]; permissions: string[] }> {
    const user = await User.query(trx ? { client: trx } : undefined)
      .where('id', userId)
      .preload('roles', (query) => query.preload('permissions'))
      .firstOrFail()

    const roles = user.roles.map((role) => role.code)
    const permissions = [
      ...new Set(user.roles.flatMap((role) => role.permissions.map((p) => p.code))),
    ]

    return { roles, permissions }
  }

  hasPermission(userPermissions: string[], required: string): boolean {
    if (userPermissions.includes('*') || userPermissions.includes('library.*')) {
      return true
    }
    return userPermissions.includes(required)
  }

  hasAnyPermission(userPermissions: string[], required: string[]): boolean {
    if (userPermissions.includes('*') || userPermissions.includes('library.*')) {
      return true
    }
    return required.some((p) => userPermissions.includes(p))
  }
}
