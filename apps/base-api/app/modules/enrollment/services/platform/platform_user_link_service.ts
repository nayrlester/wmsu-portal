import hash from '@adonisjs/core/services/hash'
import User from '#modules/enrollment/models/user'
import Organization from '#modules/enrollment/models/organization'
import Role from '#modules/enrollment/models/role'
import Permission from '#modules/enrollment/models/permission'
import type { PlatformAccessClaims } from '#modules/enrollment/services/platform/platform_identity'
import { ENROLLMENT_PERMISSIONS, UIMS_PERMISSIONS } from '#modules/enrollment/domain/enums/index'
import {
  enrollmentPackForIdentityRole,
  resolveEnrollmentLocalRoleSlug,
  resolveEnrollmentPlatformPermissions,
} from '#modules/enrollment/services/platform/enrollment_role_packs'
import {
  hasAppAccess,
  isPlatformAdmin,
} from '#modules/common-platform/services/platform_identity_rbac'
import env from '#start/env'

export default class PlatformUserLinkService {
  async resolveLocalUser(claims: PlatformAccessClaims): Promise<User> {
    const allowed =
      claims.apps.enrollment ||
      hasAppAccess(claims.permissions, 'enrollment') ||
      isPlatformAdmin(claims.roles, claims.permissions)

    if (!allowed) {
      throw new Error('Token is not authorized for USiS (missing apps.enrollment claim)')
    }

    const org = await this.resolveOrganization(claims)

    let user = await User.query().where('platformUserId', claims.sub).whereNull('deleted_at').first()

    if (!user && claims.email) {
      user = await User.query()
        .where('email', claims.email.toLowerCase())
        .where('organizationId', org.id)
        .whereNull('deleted_at')
        .first()
      if (user) {
        user.platformUserId = claims.sub
        await user.save()
      }
    }

    if (!user) {
      const autoProvision = env.get('PLATFORM_AUTO_PROVISION') ?? false
      if (!autoProvision) {
        throw new Error('Platform user not linked and auto-provision is disabled')
      }
      user = await this.provisionShadowUser(claims, org)
    }

    await this.ensureRole(user, org.id, claims.roles, claims.permissions)
    return user
  }

  mapPermissions(platformPermissions: string[], roles: string[] = []): string[] {
    return resolveEnrollmentPlatformPermissions(platformPermissions, roles)
  }

  private async resolveOrganization(claims: PlatformAccessClaims): Promise<Organization> {
    const appOrgId = claims.apps.enrollment
    let org: Organization | null = null

    if (appOrgId && appOrgId !== 'linked') {
      org = await Organization.find(appOrgId)
      if (!org) {
        org = await Organization.query().where('platformOrganizationId', appOrgId).first()
      }
    }

    if (!org) {
      org = await Organization.query().where('platformOrganizationId', claims.org_id).first()
    }

    const defaultOrgId = env.get('PLATFORM_DEFAULT_ORG_ID')
    if (!org && defaultOrgId) {
      org = await Organization.find(defaultOrgId)
    }

    const defaultCode = env.get('PLATFORM_DEFAULT_ORG_CODE') ?? 'UNI'
    if (!org) {
      org = await Organization.query().where('code', defaultCode).first()
    }

    if (!org && (env.get('PLATFORM_AUTO_PROVISION') ?? false)) {
      org = await Organization.query().orderBy('createdAt', 'asc').first()
    }

    if (!org && (env.get('PLATFORM_AUTO_PROVISION') ?? false)) {
      org = await Organization.create({
        name: 'University',
        code: defaultCode,
        platformOrganizationId: claims.org_id,
      })
    }

    if (!org) {
      throw new Error(
        'No USiS organization linked to platform. Seed org UNI or set PLATFORM_DEFAULT_ORG_ID.'
      )
    }

    if (org.platformOrganizationId && org.platformOrganizationId !== claims.org_id) {
      if (isPlatformAdmin(claims.roles, claims.permissions) && (env.get('PLATFORM_AUTO_PROVISION') ?? false)) {
        org.platformOrganizationId = claims.org_id
        await org.save()
      } else {
        throw new Error(
          'Token organization mismatch for USiS organization. Clear organizations.platform_organization_id.'
        )
      }
    }

    if (!org.platformOrganizationId) {
      org.platformOrganizationId = claims.org_id
      await org.save()
    }

    return org
  }

  private async provisionShadowUser(claims: PlatformAccessClaims, org: Organization): Promise<User> {
    return User.create({
      organizationId: org.id,
      email: claims.email.toLowerCase(),
      password: await hash.make(`platform:${claims.sub}:${Date.now()}`),
      fullName: claims.email.split('@')[0] || 'Platform User',
      platformUserId: claims.sub,
      status: 'active',
    })
  }

  private async ensureRole(
    user: User,
    orgId: string,
    identityRoles: string[],
    platformPermissions: string[]
  ) {
    for (const p of [...ENROLLMENT_PERMISSIONS, ...UIMS_PERMISSIONS]) {
      await Permission.updateOrCreate({ code: p.code }, { name: p.name, module: p.module })
    }

    const slug = resolveEnrollmentLocalRoleSlug(identityRoles)
    const packCodes = isPlatformAdmin(identityRoles, platformPermissions)
      ? ENROLLMENT_PERMISSIONS.map((p) => p.code)
      : [...resolveEnrollmentPlatformPermissions(platformPermissions, identityRoles)]

    const role = await Role.updateOrCreate(
      { organizationId: orgId, slug },
      {
        organizationId: orgId,
        slug,
        name: slug.charAt(0).toUpperCase() + slug.slice(1).replace(/_/g, ' '),
      }
    )

    if (slug === 'admin' || packCodes.includes('*')) {
      const all = await Permission.all()
      await role.related('permissions').sync(all.map((p) => p.id))
    } else if (packCodes.length) {
      const rows = await Permission.query().whereIn('code', packCodes)
      await role.related('permissions').sync(rows.map((p) => p.id))
    } else {
      await role.related('permissions').sync([])
    }

    await user.related('roles').sync({
      [role.id]: { organization_id: orgId },
    })
  }
}
