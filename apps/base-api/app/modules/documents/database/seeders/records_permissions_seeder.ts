import { BaseSeeder } from '@adonisjs/lucid/seeders'
import Permission from '#modules/documents/models/permission'
import Role from '#modules/documents/models/role'
import Tenant from '#modules/documents/models/tenant'
import {
  resolveRolePermissionSlugs,
  SYSTEM_PERMISSION_DEFINITIONS,
  SYSTEM_ROLE_DEFINITIONS,
} from '#modules/documents/domain/rbac/system_role_permissions'
import { retentionScheduleService } from '#modules/documents/services/retention_schedule_service'
import { rbacService } from '#modules/documents/services/rbac_service'

/**
 * Idempotent repair for UDMS permission catalog + least-privilege system role matrices.
 * Re-syncs system roles for every tenant so over-granted desks are stripped.
 * `node ace db:seed --files=database/seeders/records_permissions_seeder.ts`
 */
export default class extends BaseSeeder {
  async run() {
    const created = await Permission.updateOrCreateMany(
      'slug',
      SYSTEM_PERMISSION_DEFINITIONS.map((p) => ({ ...p, description: null }))
    )
    const permissionMap = Object.fromEntries(created.map((p) => [p.slug, p.id]))
    const allPermissionSlugs = Object.keys(permissionMap)

    const tenants = await Tenant.query().whereNull('deleted_at')
    for (const tenant of tenants) {
      for (const roleDef of SYSTEM_ROLE_DEFINITIONS) {
        const role = await Role.updateOrCreate(
          { tenantId: tenant.id, slug: roleDef.slug },
          {
            tenantId: tenant.id,
            name: roleDef.name,
            slug: roleDef.slug,
            description: null,
            isSystem: true,
          }
        )

        // Preserve custom (non-system) role grants; only reset system role matrices.
        const permSlugs = resolveRolePermissionSlugs(roleDef.slug, allPermissionSlugs)
        const permIds = permSlugs.map((slug) => permissionMap[slug]).filter(Boolean)
        await role.related('permissions').sync(
          Object.fromEntries(permIds.map((id) => [id, { created_at: new Date() }]))
        )
      }

      await rbacService.invalidateTenantRoleCaches(tenant.id)
      await retentionScheduleService.ensureDefaultsForTenant(tenant.id)
    }
  }
}
