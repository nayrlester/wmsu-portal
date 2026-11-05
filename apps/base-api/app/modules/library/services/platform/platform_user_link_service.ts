import { isPlatformAdmin } from '#modules/common-platform/services/platform_identity_rbac'
import { DateTime } from 'luxon'
import hash from '@adonisjs/core/services/hash'
import User from '#modules/library/models/user'
import Role from '#modules/library/models/role'
import { type PlatformAccessClaims } from '#modules/library/services/platform/platform_identity'
import type { AuthUserPayload } from '#modules/library/services/auth/auth_service'
import env from '#start/env'
import { resolveLibraryTenantForClaims } from '#modules/library/services/platform/resolve_platform_tenant'

const STAFF_PACK = [
  'books:read',
  'books:create',
  'books:update',
  'books:delete',
  'members:read',
  'members:create',
  'members:update',
  'members:delete',
  'members:approve',
  'users:read',
  'users:create',
  'users:update',
  'settings:read',
  'settings:update',
  'audit:read',
  'audit:export',
  'activity:read',
  'borrowings:read',
  'borrowings:request',
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
  'digital:delete',
  'search:query',
  'ai:query',
  'analytics:read',
  'reports:export',
] as const

/**
 * Student / member self-service only.
 * Deliberately omits borrowings:read (staff circulation list) and all staff write/admin codes.
 */
const STUDENT_PACK = [
  'library.member',
  'portal:access',
  'books:read',
  'borrowings:request',
  'borrowings:renew',
  'fines:read',
  'digital:read',
  'digital:access',
  'search:query',
] as const

function isStudentClaims(roles: string[], permissions: string[]): boolean {
  if (roles.some((r) => r.toLowerCase() === 'student')) return true
  if (permissions.includes('library.member') && !permissions.includes('library.*') && !permissions.includes('*')) {
    return true
  }
  return false
}

function isIdentityAdmin(roles: string[], platformPermissions: string[] = []): boolean {
  return isPlatformAdmin(roles, platformPermissions)
}

/**
 * Resolves platform JWT subjects to local Library users/tenants.
 * Auto-provisions a shadow user when PLATFORM_AUTO_PROVISION=true.
 * Students are hard-clamped to member/self-service permissions in ULMIS.
 */
export default class PlatformUserLinkService {
  async resolveLocalUser(claims: PlatformAccessClaims): Promise<AuthUserPayload> {
    const externalTenantId = claims.apps.library_stack
    let user = await User.query()
      .where('platform_user_id', claims.sub)
      .whereNull('deleted_at')
      .first()

    if (!user) {
      if (!env.get('PLATFORM_AUTO_PROVISION', false)) {
        throw new Error('Platform user is not linked to a local Library account')
      }
      user = await this.provisionShadowUser(claims, externalTenantId)
    } else {
      await this.ensureLocalRole(user, claims.roles, claims.permissions)
    }

    const student = isStudentClaims(claims.roles, claims.permissions)

    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      tenantId: user.tenantId,
      roles: student ? ['student', 'member'] : claims.roles,
      permissions: this.mapPermissions(claims.permissions, claims.roles),
    }
  }

  private mapPermissions(platformPermissions: string[], roles: string[] = []): string[] {
    if (isStudentClaims(roles, platformPermissions)) {
      return [...STUDENT_PACK]
    }

    if (isIdentityAdmin(roles, platformPermissions) || platformPermissions.includes('*')) {
      return [...STAFF_PACK]
    }

    const mapped = new Set<string>()

    if (platformPermissions.includes('library.*')) {
      for (const p of STAFF_PACK) mapped.add(p)
    } else if (
      platformPermissions.includes('library.member') &&
      !platformPermissions.includes('library.*')
    ) {
      for (const p of STUDENT_PACK) mapped.add(p)
    }

    for (const code of platformPermissions) {
      if (code === 'library.member' || code === 'library.*' || code === '*') continue
      mapped.add(code)
    }

    return [...mapped]
  }

  private async provisionShadowUser(
    claims: PlatformAccessClaims,
    externalTenantId?: string
  ): Promise<User> {
    const tenant = await resolveLibraryTenantForClaims(claims, externalTenantId)

    const existingByEmail = await User.query()
      .where('tenant_id', tenant.id)
      .where('email', claims.email.toLowerCase())
      .whereNull('deleted_at')
      .first()

    if (existingByEmail) {
      existingByEmail.platformUserId = claims.sub
      await existingByEmail.save()
      await this.ensureLocalRole(existingByEmail, claims.roles, claims.permissions)
      return existingByEmail
    }

    const user = await User.create({
      tenantId: tenant.id,
      email: claims.email.toLowerCase(),
      fullName: claims.email.split('@')[0] ?? 'Platform User',
      password: await hash.make(`platform:${claims.sub}:${DateTime.now().toMillis()}`),
      status: 'active',
      emailVerifiedAt: DateTime.now(),
      platformUserId: claims.sub,
    })
    await this.ensureLocalRole(user, claims.roles, claims.permissions)
    return user
  }

  /**
   * Students always get local `member` only (never staff/admin).
   * Staff get librarian/staff when missing a role.
   */
  private async ensureLocalRole(user: User, roles: string[], permissions: string[]) {
    await user.load('roles')
    const student = isStudentClaims(roles, permissions)

    if (student) {
      const memberRole = await Role.query()
        .where('tenant_id', user.tenantId)
        .where('code', 'member')
        .first()
      if (!memberRole) return

      const staffish = (user.roles ?? []).filter((r) => r.code !== 'member')
      if (staffish.length) {
        await user.related('roles').detach(staffish.map((r) => r.id))
      }
      const hasMember = (user.roles ?? []).some((r) => r.code === 'member')
      if (!hasMember) {
        await user.related('roles').attach({
          [memberRole.id]: { assigned_at: DateTime.now().toSQL() },
        })
      }
      return
    }

    if (user.roles?.length) return

    const isAdmin = isIdentityAdmin(roles, permissions)
    const preferred = isAdmin ? ['admin', 'librarian', 'staff'] : ['librarian', 'staff', 'member']

    for (const code of preferred) {
      const role = await Role.query().where('tenant_id', user.tenantId).where('code', code).first()
      if (role) {
        await user.related('roles').attach({
          [role.id]: { assigned_at: DateTime.now().toSQL() },
        })
        return
      }
    }
  }
}
