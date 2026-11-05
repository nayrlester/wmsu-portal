import User from '#modules/inventory/models/user'
import Role from '#modules/inventory/models/role'
import hash from '@adonisjs/core/services/hash'

interface CreateUserInput {
  organizationId: string
  email: string
  password: string
  fullName: string
  roleIds?: string[]
}

interface UpdateUserInput {
  email?: string
  fullName?: string
  password?: string
  status?: string
  roleIds?: string[]
}

export class UserService {
  async list(orgId: string, page = 1, limit = 25) {
    return User.query()
      .where('organizationId', orgId)
      .whereNull('deletedAt')
      .preload('roles')
      .orderBy('fullName')
      .paginate(page, limit)
  }

  async getById(orgId: string, id: string) {
    return User.query()
      .where('organizationId', orgId)
      .where('id', id)
      .whereNull('deletedAt')
      .preload('roles')
      .firstOrFail()
  }

  async create(input: CreateUserInput) {
    const user = await User.create({
      organizationId: input.organizationId,
      email: input.email.toLowerCase(),
      password: input.password,
      fullName: input.fullName,
      status: 'active',
    })

    if (input.roleIds?.length) {
      const roles = await Role.query()
        .where('organizationId', input.organizationId)
        .whereIn('id', input.roleIds)
      await user.related('roles').attach(
        roles.reduce(
          (acc, r) => {
            acc[r.id] = { organization_id: input.organizationId }
            return acc
          },
          {} as Record<string, { organization_id: string }>
        )
      )
    }

    await user.load('roles')
    return user
  }

  async update(orgId: string, id: string, input: UpdateUserInput) {
    const user = await this.getById(orgId, id)

    if (input.email) user.email = input.email.toLowerCase()
    if (input.fullName) user.fullName = input.fullName
    if (input.status) user.status = input.status
    if (input.password) user.password = await hash.make(input.password)

    await user.save()

    if (input.roleIds !== undefined) {
      const pivotData = input.roleIds.reduce(
        (acc, roleId) => {
          acc[roleId] = { organization_id: orgId }
          return acc
        },
        {} as Record<string, { organization_id: string }>
      )
      await user.related('roles').sync(pivotData)
    }

    await user.load('roles')
    return user
  }

  async softDelete(orgId: string, id: string) {
    const user = await this.getById(orgId, id)
    const { DateTime } = await import('luxon')
    user.deletedAt = DateTime.now()
    user.status = 'inactive'
    await user.save()
  }
}

export const userService = new UserService()
