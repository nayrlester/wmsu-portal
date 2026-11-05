import { BaseSeeder } from '@adonisjs/lucid/seeders'
import RbacService from '#modules/library/services/auth/rbac_service'
import Role from '#modules/library/models/role'

const ALL = [
  'acquisitions:read',
  'acquisitions:create',
  'acquisitions:update',
  'acquisitions:submit',
  'acquisitions:route',
  'acquisitions:catalog',
  'acquisitions:cancel',
]

const ROLE_MAP: Record<string, string[]> = {
  admin: ALL,
  librarian: ALL,
  staff: [
    'acquisitions:read',
    'acquisitions:create',
    'acquisitions:update',
    'acquisitions:submit',
    'acquisitions:cancel',
  ],
  faculty: ['acquisitions:read', 'acquisitions:create', 'acquisitions:submit', 'acquisitions:cancel'],
  student: ['acquisitions:read', 'acquisitions:create', 'acquisitions:submit', 'acquisitions:cancel'],
  member: ['acquisitions:read', 'acquisitions:create', 'acquisitions:submit', 'acquisitions:cancel'],
}

export default class extends BaseSeeder {
  private rbacService = new RbacService()

  async run() {
    const permissionMap = await this.rbacService.ensureGlobalPermissions()

    for (const [roleCode, codes] of Object.entries(ROLE_MAP)) {
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
