import { BaseSeeder } from '@adonisjs/lucid/seeders'
import RbacService from '#modules/library/services/auth/rbac_service'
import Role from '#modules/library/models/role'

const ANALYTICS_PERMISSIONS = ['analytics:read']

const ROLE_ANALYTICS_PERMISSIONS: Record<string, string[]> = {
  admin: ANALYTICS_PERMISSIONS,
  librarian: ANALYTICS_PERMISSIONS,
  staff: ANALYTICS_PERMISSIONS,
  member: [],
}

export default class extends BaseSeeder {
  private rbacService = new RbacService()

  async run() {
    const permissionMap = await this.rbacService.ensureGlobalPermissions()

    for (const [roleCode, codes] of Object.entries(ROLE_ANALYTICS_PERMISSIONS)) {
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
