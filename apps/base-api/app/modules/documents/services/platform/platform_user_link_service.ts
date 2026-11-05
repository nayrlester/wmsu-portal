import { isPlatformAdmin } from '#modules/common-platform/services/platform_identity_rbac'
import { DateTime } from 'luxon'
import hash from '@adonisjs/core/services/hash'
import User from '#modules/documents/models/user'
import Role from '#modules/documents/models/role'
import { type PlatformAccessClaims } from '#modules/documents/services/platform/platform_identity'
import { rbacService } from '#modules/documents/services/rbac_service'
import { DefaultRoleSlug } from '#modules/documents/domain/enums/index'
import { SYSTEM_PERMISSION_DEFINITIONS } from '#modules/documents/domain/rbac/system_role_permissions'
import env from '#start/env'
import { resolveUdmsTenantForClaims } from '#modules/documents/services/platform/resolve_platform_tenant'

/**
 * Resolves platform JWT subjects to local DocTrack users/tenants.
 * Auto-provisions a shadow user when PLATFORM_AUTO_PROVISION=true.
 */
export default class PlatformUserLinkService {
  async resolveLocalUser(claims: PlatformAccessClaims): Promise<User> {
    const externalTenantId = this.resolveDocstrackTenantId(claims)
    let user = await User.query()
      .where('platform_user_id', claims.sub)
      .whereNull('deleted_at')
      .first()

    if (!user) {
      if (!env.get('PLATFORM_AUTO_PROVISION', false)) {
        throw new Error('Platform user is not linked to a local DocTrack account')
      }
      user = await this.provisionShadowUser(claims, externalTenantId)
    } else {
      await this.ensureAdminRole(user, claims)
    }

    return user
  }

  mapPermissions(platformPermissions: string[], claims?: PlatformAccessClaims): string[] {
    const mapped = new Set<string>()
    const allSlugs = SYSTEM_PERMISSION_DEFINITIONS.map((p) => p.slug)
    const roles = claims?.roles ?? []

    if (
      isPlatformAdmin(roles, platformPermissions) ||
      platformPermissions.includes('*') ||
      platformPermissions.includes('docstrack.*')
    ) {
      mapped.add('*')
      for (const slug of allSlugs) mapped.add(slug)
      return [...mapped]
    }

    for (const code of platformPermissions) {
      if (code === 'docstrack.access') {
        mapped.add('documents.view')
        mapped.add('documents.download')
        continue
      }
      if (allSlugs.includes(code)) mapped.add(code)
    }

    if (claims?.apps.docstrack && mapped.size === 0) {
      mapped.add('documents.view')
      mapped.add('documents.download')
    }

    return [...mapped]
  }

  private resolveDocstrackTenantId(claims: PlatformAccessClaims): string | undefined {
    const linked = claims.apps.docstrack
    if (!linked || linked === 'linked') return undefined
    return linked
  }

  private resolveProvisionRoleSlug(claims: PlatformAccessClaims): DefaultRoleSlug {
    const roleSlugs = claims.roles.map((r) => r.toLowerCase())
    if (isPlatformAdmin(claims.roles, claims.permissions)) {
      return DefaultRoleSlug.TENANT_OWNER
    }
    if (roleSlugs.some((r) => r.includes('approver'))) {
      return DefaultRoleSlug.APPROVER
    }

    const mapped = this.mapPermissions(claims.permissions, claims)
    if (mapped.includes('documents.approve')) return DefaultRoleSlug.APPROVER
    if (mapped.includes('documents.create')) return DefaultRoleSlug.STAFF
    return DefaultRoleSlug.VIEWER
  }

  private async provisionShadowUser(
    claims: PlatformAccessClaims,
    externalTenantId?: string
  ): Promise<User> {
    const tenant = await resolveUdmsTenantForClaims(claims, externalTenantId)

    const existingByEmail = await User.query()
      .where('tenant_id', tenant.id)
      .where('email', claims.email.toLowerCase())
      .whereNull('deleted_at')
      .first()

    if (existingByEmail) {
      existingByEmail.platformUserId = claims.sub
      await existingByEmail.save()
      await this.ensureAdminRole(existingByEmail, claims)
      return existingByEmail
    }

    const user = await User.create({
      tenantId: tenant.id,
      email: claims.email.toLowerCase(),
      fullName: claims.email.split('@')[0] ?? 'Platform User',
      password: await hash.make(`platform:${claims.sub}:${DateTime.now().toMillis()}`),
      status: 'active',
      emailVerified: true,
      emailVerifiedAt: DateTime.now(),
      platformUserId: claims.sub,
    })

    await this.ensureAdminRole(user, claims)
    return user
  }

  /** Keep Identity admins on TENANT_OWNER/ADMIN without failing SSO on re-attach. */
  private async ensureAdminRole(user: User, claims: PlatformAccessClaims) {
    try {
      const roleSlug = this.resolveProvisionRoleSlug(claims)
      if (roleSlug !== DefaultRoleSlug.TENANT_OWNER && roleSlug !== DefaultRoleSlug.ADMIN) {
        return
      }
      if (!user.tenantId) return

      const role = await Role.query()
        .where('tenant_id', user.tenantId)
        .where('slug', roleSlug)
        .whereNull('deleted_at')
        .first()
      if (!role) return

      await user.load('roles', (q) => q.wherePivot('tenant_id', user.tenantId!))
      if (user.roles.some((r) => r.id === role.id || r.slug === roleSlug)) {
        return
      }

      await user.related('roles').attach({
        [role.id]: { tenant_id: user.tenantId, created_at: new Date() },
      })
    } catch {
      // Role sync must never block Identity SSO auto-login.
    }
  }
}
