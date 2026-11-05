import { BaseSeeder } from '@adonisjs/lucid/seeders'
import Role from '#modules/library/models/role'
import RbacService from '#modules/library/services/auth/rbac_service'

/**
 * Syncs newly added ULMIS permissions onto existing tenant roles.
 * Run: node ace db:seed --files=database/seeders/ulmis_permission_seeder.ts
 */
export default class extends BaseSeeder {
  async run() {
    const rbac = new RbacService()
    const permissionMap = await rbac.ensureGlobalPermissions()

    const roles = await Role.query().where('is_system', true).preload('permissions')

    for (const role of roles) {
      const desired =
        role.code === 'admin'
          ? [...permissionMap.keys()]
          : role.code === 'librarian'
            ? [
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
                'activity:read',
              ]
            : role.code === 'staff'
              ? [
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
                  'digital:read',
                  'digital:access',
                  'search:query',
                  'ai:query',
                  'analytics:read',
                  'users:read',
                  'activity:read',
                ]
              : role.code === 'member'
                ? [
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
                    'ai:query',
                  ]
                : []

      const ids = desired
        .map((code) => permissionMap.get(code)?.id)
        .filter(Boolean) as string[]

      await role.related('permissions').sync(ids)
    }
  }
}
