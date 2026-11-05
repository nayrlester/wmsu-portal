import {
  hasIdentityRole,
  isPlatformAdmin,
} from '#modules/common-platform/services/platform_identity_rbac'
import hash from '@adonisjs/core/services/hash'
import User from '#modules/records/models/user'
import Organization from '#modules/records/models/organization'
import Role from '#modules/records/models/role'
import Permission from '#modules/records/models/permission'
import type { PlatformAccessClaims } from '#modules/records/services/platform/platform_identity'
import { UIMS_PERMISSIONS } from '#modules/records/domain/enums/index'
import { TORMS_PERMISSIONS, TORMS_ROLE_DEFS } from '#modules/records/domain/torms/torms_permissions'
import env from '#start/env'

export default class PlatformUserLinkService {
  async resolveLocalUser(claims: PlatformAccessClaims): Promise<User> {
    if (!claims.apps.records && !this.isIdentityAdmin(claims.roles)) {
      throw new Error('Token is not authorized for TORMS (missing apps.records claim)')
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

    await this.ensureRole(user, org.id, claims.roles)
    return user
  }

  mapPermissions(platformPermissions: string[], roles: string[] = []): string[] {
    const catalog = [
      ...TORMS_PERMISSIONS.map((p) => p.code),
      ...UIMS_PERMISSIONS.map((p) => p.code),
    ]

    const recordsAccess =
      platformPermissions.includes('records.access') ||
      platformPermissions.some((c) => c.startsWith('records.') || c.startsWith('torms.'))

    if (isPlatformAdmin(roles, platformPermissions) || platformPermissions.includes('*')) {
      return ['*', ...catalog]
    }

    const mapped = new Set<string>()

    if (hasIdentityRole(roles, 'student')) {
      for (const code of ['records.read', 'torms.requests.read', 'torms.requests.write']) {
        mapped.add(code)
      }
    }

    if (hasIdentityRole(roles, 'employee') && recordsAccess) {
      const staff = TORMS_ROLE_DEFS.find((r) => r.slug === 'registrar_staff')
      if (staff) {
        for (const code of staff.codes) mapped.add(code)
      }
    }

    if (hasIdentityRole(roles, 'records_officer', 'registrar')) {
      for (const p of TORMS_PERMISSIONS) mapped.add(p.code)
    }

    if (
      recordsAccess &&
      !hasIdentityRole(roles, 'student') &&
      !hasIdentityRole(roles, 'records_officer', 'registrar') &&
      mapped.size === 0
    ) {
      const viewer = TORMS_ROLE_DEFS.find((r) => r.slug === 'records_viewer')
      if (viewer) {
        for (const code of viewer.codes) mapped.add(code)
      }
    }

    for (const code of platformPermissions) {
      if (code === 'records.access' || code === 'records.*') continue
      if (catalog.includes(code)) mapped.add(code)
    }

    return [...mapped]
  }

  private isIdentityAdmin(roles: string[], platformPermissions: string[] = []): boolean {
    return isPlatformAdmin(roles, platformPermissions)
  }

  private async resolveOrganization(claims: PlatformAccessClaims): Promise<Organization> {
    const appOrgId = claims.apps.records
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
        'No TORMS organization linked to platform. Seed org UNI or set PLATFORM_DEFAULT_ORG_ID.'
      )
    }

    if (org.platformOrganizationId && org.platformOrganizationId !== claims.org_id) {
      if (this.isIdentityAdmin(claims.roles) && (env.get('PLATFORM_AUTO_PROVISION') ?? false)) {
        org.platformOrganizationId = claims.org_id
        await org.save()
      } else {
        throw new Error(
          'Token organization mismatch for TORMS organization. Clear organizations.platform_organization_id.'
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

  private async ensureRole(user: User, orgId: string, roles: string[]) {
    const wantAdmin = this.isIdentityAdmin(roles)
    const slug = wantAdmin ? 'admin' : 'staff'

    let role = await Role.query().where('organizationId', orgId).where('slug', slug).first()
    if (!role) {
      for (const p of [...TORMS_PERMISSIONS, ...UIMS_PERMISSIONS]) {
        await Permission.updateOrCreate({ code: p.code }, { name: p.name, module: p.module })
      }
      role = await Role.updateOrCreate(
        { organizationId: orgId, slug },
        {
          organizationId: orgId,
          slug,
          name: slug === 'admin' ? 'Administrator' : 'Staff',
        }
      )
    }

    if (slug === 'admin') {
      const all = await Permission.all()
      await role.related('permissions').sync(all.map((p) => p.id))
    }

    const withRoles = await User.query()
      .where('id', user.id)
      .preload('roles', (q) => q.wherePivot('organization_id', orgId))
      .first()

    const hasDesired = withRoles?.roles?.some((r) => r.slug === slug)
    if (hasDesired) return

    if (wantAdmin) {
      await user.related('roles').sync({
        [role.id]: { organization_id: orgId },
      })
      return
    }

    if (withRoles?.roles?.length) return

    await user.related('roles').attach({
      [role.id]: { organization_id: orgId },
    })
  }
}
