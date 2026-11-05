import { BaseSeeder } from '@adonisjs/lucid/seeders'
import RbacService from '#modules/library/services/auth/rbac_service'
import Role from '#modules/library/models/role'

const CIRCULATION_PERMISSIONS = [
  'borrowings:read',
  'borrowings:request',
  'borrowings:approve',
  'borrowings:checkout',
  'borrowings:return',
  'borrowings:mark_lost',
  'fines:read',
  'fines:collect',
  'fines:waive',
  'fines:adjust',
]

const ROLE_CIRCULATION_PERMISSIONS: Record<string, string[]> = {
  admin: CIRCULATION_PERMISSIONS,
  librarian: [
    'borrowings:read',
    'borrowings:approve',
    'borrowings:checkout',
    'borrowings:return',
    'borrowings:mark_lost',
    'fines:read',
    'fines:collect',
    'fines:waive',
    'fines:adjust',
  ],
  staff: [
    'borrowings:read',
    'borrowings:request',
    'borrowings:checkout',
    'borrowings:return',
    'fines:read',
    'fines:collect',
  ],
  member: ['borrowings:read', 'borrowings:request', 'fines:read'],
}

export default class extends BaseSeeder {
  private rbacService = new RbacService()

  async run() {
    const permissionMap = await this.rbacService.ensureGlobalPermissions()

    for (const [roleCode, codes] of Object.entries(ROLE_CIRCULATION_PERMISSIONS)) {
      const roles = await Role.query().where('code', roleCode).preload('permissions')

      for (const role of roles) {
        const existing = new Set(role.permissions.map((p) => p.code))
        const toAttach = codes.filter((c) => !existing.has(c))

        const permissionIds = toAttach
          .map((code) => permissionMap.get(code)?.id)
          .filter(Boolean) as string[]

        if (permissionIds.length) {
          await role.related('permissions').attach(permissionIds)
        }
      }
    }
  }
}
