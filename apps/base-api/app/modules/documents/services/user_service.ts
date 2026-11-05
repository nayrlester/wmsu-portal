import crypto from 'node:crypto'
import { DateTime } from 'luxon'
import User from '#modules/documents/models/user'
import { AuditAction, DefaultRoleSlug } from '#modules/documents/domain/enums/index'
import {
  UserAlreadyExistsException,
  UserNotFoundException,
  UserOperationForbiddenException,
} from '#modules/documents/domain/exceptions/user_exceptions'
import { auditService } from '#modules/documents/services/audit_service'
import { planLimitService } from '#modules/documents/services/plan_limit_service'
import { rbacService } from '#modules/documents/services/rbac_service'
import { tenantContext } from '#modules/documents/domain/tenant_context'

export interface TenantUserListItem {
  id: string
  email: string
  fullName: string | null
  status: string
  emailVerified: boolean
  lastLoginAt: string | null
  createdAt: string
  roles: Array<{ id: string; name: string; slug: string }>
}

export interface CreateTenantUserInput {
  email: string
  fullName: string
  roleId: string
  password?: string
}

export interface UpdateTenantUserInput {
  fullName?: string
  status?: string
  roleId?: string
}

export class UserService {
  async list(tenantId: string, search?: string, page = 1, limit = 25) {
    const safeLimit = Math.min(Math.max(limit, 1), 100)
    const query = User.query()
      .where('tenant_id', tenantId)
      .whereNull('deleted_at')
      .preload('roles', (roleQuery) => {
        roleQuery.wherePivot('tenant_id', tenantId)
      })
      .orderBy('full_name')
      .orderBy('email')

    if (search?.trim()) {
      const term = `%${search.trim().toLowerCase()}%`
      query.where((builder) => {
        builder.whereILike('email', term).orWhereILike('full_name', term)
      })
    }

    const paginator = await query.paginate(Math.max(page, 1), safeLimit)
    return {
      users: paginator.all().map((user) => this.serializeUser(user)),
      meta: paginator.getMeta(),
    }
  }

  async listAssignableRoles(tenantId: string) {
    const roles = await rbacService.listRoles(tenantId)
    return roles
      .filter((role) => role.slug !== DefaultRoleSlug.TENANT_OWNER)
      .map((role) => ({
        id: role.id,
        name: role.name,
        slug: role.slug,
        isSystem: role.isSystem,
      }))
  }

  async create(
    tenantId: string,
    actorId: string,
    input: CreateTenantUserInput
  ): Promise<{ user: TenantUserListItem; temporaryPassword?: string }> {
    await planLimitService.assertCanAddUser(tenantId)

    const email = input.email.toLowerCase().trim()
    const existing = await User.query().where('email', email).whereNull('deleted_at').first()
    if (existing) {
      throw new UserAlreadyExistsException()
    }

    const role = await rbacService.getRole(input.roleId, tenantId)
    this.assertAssignableRole(role.slug)

    const temporaryPassword = input.password?.trim() || this.generateTemporaryPassword()
    const user = await User.create({
      tenantId,
      email,
      password: input.password?.trim() || temporaryPassword,
      fullName: input.fullName.trim(),
      status: 'active',
      emailVerified: true,
      emailVerifiedAt: DateTime.now(),
      isSuperAdmin: false,
    })

    await user.related('roles').sync({
      [role.id]: { tenant_id: tenantId, created_at: new Date() },
    })

    await user.load('roles', (roleQuery) => {
      roleQuery.wherePivot('tenant_id', tenantId)
    })

    await auditService.log({
      tenantId,
      userId: actorId,
      action: AuditAction.CREATE,
      entityType: 'user',
      entityId: user.id,
      newValues: { email: user.email, roleSlug: role.slug },
    })

    return {
      user: this.serializeUser(user),
      temporaryPassword: input.password?.trim() ? undefined : temporaryPassword,
    }
  }

  async update(
    tenantId: string,
    actorId: string,
    userId: string,
    input: UpdateTenantUserInput
  ): Promise<TenantUserListItem> {
    const user = await this.findTenantUser(userId, tenantId)
    const oldValues: Record<string, unknown> = {
      fullName: user.fullName,
      status: user.status,
    }

    if (input.fullName !== undefined) {
      user.fullName = input.fullName.trim()
    }

    if (input.status !== undefined) {
      if (input.status !== 'active' && input.status !== 'inactive') {
        throw new UserOperationForbiddenException('Status must be active or inactive')
      }

      if (input.status === 'inactive') {
        await this.assertCanDeactivate(user, tenantId, actorId)
      }

      user.status = input.status
    }

    if (input.roleId !== undefined) {
      const role = await rbacService.getRole(input.roleId, tenantId)
      this.assertAssignableRole(role.slug)
      await this.assertCanChangeRole(user, tenantId)

      await user.related('roles').sync({
        [role.id]: { tenant_id: tenantId, created_at: new Date() },
      })
      oldValues.roleId = user.roles[0]?.id
    }

    await user.save()
    await user.load('roles', (roleQuery) => {
      roleQuery.wherePivot('tenant_id', tenantId)
    })

    await auditService.log({
      tenantId,
      userId: actorId,
      action: AuditAction.UPDATE,
      entityType: 'user',
      entityId: user.id,
      oldValues,
      newValues: {
        fullName: user.fullName,
        status: user.status,
        roleId: user.roles[0]?.id,
      },
    })

    return this.serializeUser(user)
  }

  async deactivate(tenantId: string, actorId: string, userId: string): Promise<void> {
    const user = await this.findTenantUser(userId, tenantId)
    await this.assertCanDeactivate(user, tenantId, actorId)

    user.status = 'inactive'
    user.deletedAt = DateTime.now()
    await user.save()

    await auditService.log({
      tenantId,
      userId: actorId,
      action: AuditAction.DELETE,
      entityType: 'user',
      entityId: user.id,
      oldValues: { email: user.email, status: 'active' },
      newValues: { status: 'inactive' },
    })
  }

  private async findTenantUser(userId: string, tenantId: string): Promise<User> {
    const user = await User.query()
      .where('id', userId)
      .where('tenant_id', tenantId)
      .whereNull('deleted_at')
      .preload('roles', (roleQuery) => {
        roleQuery.wherePivot('tenant_id', tenantId)
      })
      .first()

    if (!user) {
      throw new UserNotFoundException()
    }

    return user
  }

  private assertAssignableRole(roleSlug: string): void {
    if (roleSlug === DefaultRoleSlug.TENANT_OWNER) {
      throw new UserOperationForbiddenException('Tenant owner role cannot be assigned through this flow')
    }
  }

  private async assertCanDeactivate(user: User, tenantId: string, actorId: string): Promise<void> {
    if (user.id === actorId) {
      throw new UserOperationForbiddenException('You cannot deactivate your own account')
    }

    const isOwner = user.roles.some((role) => role.slug === DefaultRoleSlug.TENANT_OWNER)
    if (!isOwner) return

    const ownerCount = await User.query()
      .where('tenant_id', tenantId)
      .whereNull('deleted_at')
      .where('status', 'active')
      .whereHas('roles', (roleQuery) => {
        roleQuery.where('slug', DefaultRoleSlug.TENANT_OWNER).wherePivot('tenant_id', tenantId)
      })
      .count('* as total')

    if (Number(ownerCount[0]?.$extras.total ?? 0) <= 1) {
      throw new UserOperationForbiddenException('Cannot deactivate the only tenant owner')
    }
  }

  private async assertCanChangeRole(user: User, tenantId: string): Promise<void> {
    const isOwner = user.roles.some((role) => role.slug === DefaultRoleSlug.TENANT_OWNER)
    if (!isOwner) return

    const ownerCount = await User.query()
      .where('tenant_id', tenantId)
      .whereNull('deleted_at')
      .where('status', 'active')
      .whereHas('roles', (roleQuery) => {
        roleQuery.where('slug', DefaultRoleSlug.TENANT_OWNER).wherePivot('tenant_id', tenantId)
      })
      .count('* as total')

    if (Number(ownerCount[0]?.$extras.total ?? 0) <= 1) {
      throw new UserOperationForbiddenException('Cannot change role of the only tenant owner')
    }
  }

  private generateTemporaryPassword(): string {
    const base = crypto.randomBytes(9).toString('base64url')
    return `${base}A1!`
  }

  private serializeUser(user: User): TenantUserListItem {
    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      status: user.status,
      emailVerified: user.emailVerified,
      lastLoginAt: user.lastLoginAt?.toISO() ?? null,
      createdAt: user.createdAt.toISO()!,
      roles: user.roles.map((role) => ({
        id: role.id,
        name: role.name,
        slug: role.slug,
      })),
    }
  }

  requireTenantId(): string {
    return tenantContext.requireTenantId()
  }
}

export const userService = new UserService()
