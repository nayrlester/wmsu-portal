import { DateTime } from 'luxon'
import db from '@adonisjs/lucid/services/db'
import Permission from '#modules/documents/models/permission'
import Role from '#modules/documents/models/role'
import User from '#modules/documents/models/user'
import { tenantContext } from '#modules/documents/domain/tenant_context'
import { DefaultRoleSlug } from '#modules/documents/domain/enums/index'
import {
  RoleInUseException,
  SystemRoleProtectedException,
} from '#modules/documents/domain/rbac/rbac_exceptions'
import { cacheService } from '#infrastructure/cache/redis_cache_service'
import env from '#start/env'

const PERMISSIONS_CACHE_TTL = () => env.get('CACHE_TTL_PERMISSIONS_SECONDS') ?? 900

function permissionsCacheKey(userId: string, tenantId: string): string {
  return `cache:permissions:${userId}:${tenantId}`
}

export class RbacService {
  async listPermissions(): Promise<Permission[]> {
    return Permission.query().orderBy('module').orderBy('name')
  }

  async listRoles(tenantId: string): Promise<Role[]> {
    return Role.query()
      .where('tenant_id', tenantId)
      .whereNull('deleted_at')
      .preload('permissions')
      .orderBy('name')
  }

  async getRole(roleId: string, tenantId: string): Promise<Role> {
    return Role.query()
      .where('id', roleId)
      .where('tenant_id', tenantId)
      .whereNull('deleted_at')
      .preload('permissions')
      .firstOrFail()
  }

  async createRole(
    tenantId: string,
    data: { name: string; slug: string; description?: string; permissionIds?: string[] }
  ): Promise<Role> {
    const role = await Role.create({
      tenantId,
      name: data.name,
      slug: data.slug,
      description: data.description ?? null,
      isSystem: false,
    })

    if (data.permissionIds?.length) {
      await role.related('permissions').sync(
        Object.fromEntries(data.permissionIds.map((id) => [id, { created_at: new Date() }]))
      )
    }

    await role.load('permissions')
    await this.invalidateTenantRoleCaches(tenantId)
    return role
  }

  async updateRole(
    roleId: string,
    tenantId: string,
    data: { name: string; description?: string | null }
  ): Promise<Role> {
    const role = await this.getRole(roleId, tenantId)

    if (role.isSystem) {
      throw new SystemRoleProtectedException('System role name cannot be changed')
    }

    role.name = data.name
    role.description = data.description ?? null
    await role.save()
    await role.load('permissions')
    await this.invalidateTenantRoleCaches(tenantId)
    return role
  }

  async updateRolePermissions(roleId: string, tenantId: string, permissionIds: string[]): Promise<Role> {
    const role = await this.getRole(roleId, tenantId)

    await role.related('permissions').sync(
      Object.fromEntries(permissionIds.map((id) => [id, { created_at: new Date() }]))
    )

    await role.load('permissions')
    await this.invalidateTenantRoleCaches(tenantId)
    return role
  }

  async deleteRole(roleId: string, tenantId: string): Promise<void> {
    const role = await this.getRole(roleId, tenantId)

    if (role.isSystem) {
      throw new SystemRoleProtectedException('System roles cannot be deleted')
    }

    const assignment = await db
      .from('user_roles')
      .where('role_id', role.id)
      .where('tenant_id', tenantId)
      .first()

    if (assignment) {
      throw new RoleInUseException()
    }

    role.deletedAt = DateTime.now()
    await role.save()
    await this.invalidateTenantRoleCaches(tenantId)
  }

  async assignRoleToUser(userId: string, roleId: string, tenantId: string): Promise<void> {
    const user = await User.query()
      .where('id', userId)
      .where('tenant_id', tenantId)
      .whereNull('deleted_at')
      .firstOrFail()

    const role = await Role.query()
      .where('id', roleId)
      .where('tenant_id', tenantId)
      .firstOrFail()

    const existing = await db
      .from('user_roles')
      .where('user_id', userId)
      .where('role_id', role.id)
      .where('tenant_id', tenantId)
      .first()

    if (!existing) {
      await user.related('roles').attach({
        [role.id]: { tenant_id: tenantId, created_at: new Date() },
      })
    }

    await cacheService.forget(permissionsCacheKey(userId, tenantId))
  }

  async getUserPermissions(user: User, tenantId: string): Promise<string[]> {
    if (user.isSuperAdmin) {
      return cacheService.remember('cache:permissions:superadmin:all', 3600, async () => {
        const all = await Permission.all()
        return all.map((p) => p.slug)
      })
    }

    return cacheService.remember(permissionsCacheKey(user.id, tenantId), PERMISSIONS_CACHE_TTL(), async () => {
      await user.load('roles', (q) => {
        q.wherePivot('tenant_id', tenantId).preload('permissions')
      })

      const slugs = new Set<string>()
      for (const role of user.roles) {
        if (role.slug === DefaultRoleSlug.TENANT_OWNER) {
          const all = await Permission.all()
          return all.map((p) => p.slug)
        }
        for (const permission of role.permissions) {
          slugs.add(permission.slug)
        }
      }

      return Array.from(slugs)
    })
  }

  /**
   * Merges local RBAC permissions with Identity JWT-mapped permissions when present.
   * Platform claims are per-request and must not be Redis-cached alone.
   */
  async getEffectivePermissions(
    user: User,
    tenantId: string,
    platformPermissions?: string[]
  ): Promise<string[]> {
    const local = await this.getUserPermissions(user, tenantId)
    if (!platformPermissions?.length) {
      return local
    }
    if (platformPermissions.includes('*')) {
      const all = await Permission.all()
      return all.map((p) => p.slug)
    }
    return [...new Set([...local, ...platformPermissions])]
  }

  async hasPermission(user: User, permissionSlug: string, tenantId: string): Promise<boolean> {
    const permissions = await this.getUserPermissions(user, tenantId)
    return permissions.includes(permissionSlug)
  }

  async invalidateTenantRoleCaches(tenantId: string): Promise<void> {
    const users = await User.query().where('tenant_id', tenantId).select('id')
    await Promise.all(users.map((user) => cacheService.forget(permissionsCacheKey(user.id, tenantId))))
  }

  async invalidateUserPermissions(userId: string, tenantId: string): Promise<void> {
    await cacheService.forget(permissionsCacheKey(userId, tenantId))
  }

  isDefaultRole(slug: string): boolean {
    return Object.values(DefaultRoleSlug).includes(slug as DefaultRoleSlug)
  }

  requireTenantId(): string {
    return tenantContext.requireTenantId()
  }
}

export const rbacService = new RbacService()
