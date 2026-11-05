import Permission from '#modules/documents/models/permission'
import Role from '#modules/documents/models/role'
import User from '#modules/documents/models/user'
import { DefaultRoleSlug } from '#modules/documents/domain/enums/index'
import {
  resolveRolePermissionSlugs,
  SYSTEM_PERMISSION_DEFINITIONS,
  SYSTEM_ROLE_DEFINITIONS,
} from '#modules/documents/domain/rbac/system_role_permissions'

export class TenantProvisioningService {
  /** Global permission catalog — required before role sync on fresh databases. */
  async ensureGlobalPermissions(): Promise<Record<string, string>> {
    const created = await Permission.updateOrCreateMany(
      'slug',
      SYSTEM_PERMISSION_DEFINITIONS.map((p) => ({ ...p, description: null }))
    )

    return Object.fromEntries(created.map((p) => [p.slug, p.id]))
  }

  async provisionDefaultRoles(tenantId: string): Promise<void> {
    const permissionMap = await this.ensureGlobalPermissions()
    const allPermissionSlugs = Object.keys(permissionMap)

    for (const roleDef of SYSTEM_ROLE_DEFINITIONS) {
      const role = await Role.updateOrCreate(
        { tenantId, slug: roleDef.slug },
        {
          tenantId,
          name: roleDef.name,
          slug: roleDef.slug,
          description: null,
          isSystem: true,
        }
      )

      const permSlugs = resolveRolePermissionSlugs(roleDef.slug, allPermissionSlugs)
      const permIds = permSlugs.map((slug) => permissionMap[slug]).filter(Boolean)

      await role.related('permissions').sync(
        Object.fromEntries(permIds.map((id) => [id, { created_at: new Date() }]))
      )
    }

    await this.invalidateTenantPermissionCaches(tenantId)
  }

  async repairSystemRoles(tenantId: string): Promise<void> {
    await this.provisionDefaultRoles(tenantId)
  }

  private async invalidateTenantPermissionCaches(tenantId: string): Promise<void> {
    const { rbacService } = await import('#modules/documents/services/rbac_service')
    await rbacService.invalidateTenantRoleCaches(tenantId)
  }

  async assignOwnerRole(user: User, tenantId: string): Promise<void> {
    const ownerRole = await Role.query()
      .where('tenant_id', tenantId)
      .where('slug', DefaultRoleSlug.TENANT_OWNER)
      .firstOrFail()

    await user.related('roles').sync({
      [ownerRole.id]: { tenant_id: tenantId, created_at: new Date() },
    })
  }
}

export const tenantProvisioningService = new TenantProvisioningService()
