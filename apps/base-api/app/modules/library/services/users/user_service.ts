import { DateTime } from 'luxon'
import hash from '@adonisjs/core/services/hash'
import User from '#modules/library/models/user'
import Role from '#modules/library/models/role'
import { tenantContext } from '#modules/library/services/tenant/tenant_context'
import {
  isIdentityLibraryStaffSyncConfigured,
  provisionIdentityLibraryStaff,
} from '#modules/library/services/platform/identity_library_staff_client'

export default class UserService {
  async list(page = 1, perPage = 25) {
    const tenantId = tenantContext.get().id

    return User.query()
      .where('tenant_id', tenantId)
      .whereNull('deleted_at')
      .preload('roles')
      .orderBy('created_at', 'desc')
      .paginate(page, perPage)
  }

  async invite(input: {
    email: string
    fullName: string
    roleCode: string
    password?: string
    assignedBy: string
  }) {
    const tenantId = tenantContext.get().id
    const email = input.email.trim().toLowerCase()

    const existing = await User.query()
      .where('tenant_id', tenantId)
      .where('email', email)
      .whereNull('deleted_at')
      .first()

    if (existing) {
      throw new Error('User already exists in this tenant')
    }

    const role = await Role.query()
      .where('tenant_id', tenantId)
      .where('code', input.roleCode)
      .firstOrFail()

    const plaintextPassword = input.password ?? `Temp${Date.now()}!`

    const user = await User.create({
      tenantId,
      email,
      fullName: input.fullName,
      password: await hash.make(plaintextPassword),
      status: input.password ? 'active' : 'invited',
    })

    await user.related('roles').attach({
      [role.id]: {
        assigned_at: DateTime.now().toSQL(),
        assigned_by: input.assignedBy,
      },
    })

    const identity = await provisionIdentityLibraryStaff({
      externalId: `library-user:${user.id}`,
      email: user.email,
      fullName: user.fullName,
      password: plaintextPassword,
    })
    if (isIdentityLibraryStaffSyncConfigured() && !identity?.id) {
      await user.delete()
      throw new Error(
        'Identity staff provision failed. Check PLATFORM_IDENTITY_URL and SERVICE_API_KEY alignment with Identity ENROLLMENT_SERVICE_API_KEY.'
      )
    }
    if (identity?.id) {
      user.platformUserId = identity.id
      await user.save()
    }

    await user.load('roles')
    return user
  }

  async getById(userId: string) {
    const tenantId = tenantContext.get().id

    return User.query()
      .where('id', userId)
      .where('tenant_id', tenantId)
      .whereNull('deleted_at')
      .preload('roles')
      .firstOrFail()
  }

  async update(userId: string, input: { fullName?: string; status?: User['status']; roleCode?: string }) {
    const tenantId = tenantContext.get().id

    const user = await User.query()
      .where('id', userId)
      .where('tenant_id', tenantId)
      .whereNull('deleted_at')
      .firstOrFail()

    if (input.fullName) user.fullName = input.fullName
    if (input.status) user.status = input.status
    await user.save()

    if (input.roleCode) {
      const role = await Role.query()
        .where('tenant_id', tenantId)
        .where('code', input.roleCode)
        .firstOrFail()

      await user.related('roles').sync({
        [role.id]: {
          assigned_at: DateTime.now().toSQL(),
        },
      })
    }

    await user.load('roles')
    return user
  }

  serializeUser(user: User) {
    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      status: user.status,
      roles: user.roles?.map((r) => r.code) ?? [],
      platformUserId: user.platformUserId,
      isSystemAccount: user.email.endsWith('@internal.library'),
      createdAt: user.createdAt.toISO(),
    }
  }
}
