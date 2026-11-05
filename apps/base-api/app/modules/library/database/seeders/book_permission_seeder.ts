import { BaseSeeder } from '@adonisjs/lucid/seeders'
import RbacService from '#modules/library/services/auth/rbac_service'
import Role from '#modules/library/models/role'

const BOOK_PERMISSIONS = ['books:read', 'books:create', 'books:update', 'books:delete']

const ROLE_BOOK_PERMISSIONS: Record<string, string[]> = {
  admin: BOOK_PERMISSIONS,
  librarian: BOOK_PERMISSIONS,
  staff: ['books:read'],
  member: ['books:read'],
}

export default class extends BaseSeeder {
  private rbacService = new RbacService()

  async run() {
    const permissionMap = await this.rbacService.ensureGlobalPermissions()

    for (const [roleCode, codes] of Object.entries(ROLE_BOOK_PERMISSIONS)) {
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
