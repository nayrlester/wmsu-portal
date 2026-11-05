export const ULMIS_TOR_ROLES = [
  {
    code: 'admin',
    torName: 'system administrator',
    description: 'TOR system administrator — full ULMIS administration',
  },
  {
    code: 'librarian',
    torName: 'librarian',
    description: 'TOR librarian — library operations and configuration (non-admin)',
  },
  {
    code: 'faculty',
    torName: 'faculty',
    description: 'TOR faculty patron role (LIB-019)',
  },
  {
    code: 'student',
    torName: 'student',
    description: 'TOR student patron role (LIB-019)',
  },
] as const

export const ULMIS_FOUNDATION_PERMISSIONS = [
  {
    code: 'settings:read',
    name: 'View ULMIS settings',
    module: 'foundation',
    tor: ['LIB-030', 'LIB-014'],
  },
  {
    code: 'settings:update',
    name: 'Update ULMIS settings',
    module: 'foundation',
    tor: ['LIB-030'],
  },
  {
    code: 'audit:read',
    name: 'View audit trail',
    module: 'foundation',
    tor: ['LIB-015'],
  },
  {
    code: 'audit:export',
    name: 'Export audit trail',
    module: 'foundation',
    tor: ['LIB-015'],
  },
  {
    code: 'users:read',
    name: 'View staff users',
    module: 'foundation',
    tor: ['LIB-019'],
  },
  {
    code: 'users:create',
    name: 'Invite staff users',
    module: 'foundation',
    tor: ['LIB-019'],
  },
  {
    code: 'users:update',
    name: 'Update staff users',
    module: 'foundation',
    tor: ['LIB-019'],
  },
] as const

export type UlmisFoundationPermissionCode =
  (typeof ULMIS_FOUNDATION_PERMISSIONS)[number]['code']
