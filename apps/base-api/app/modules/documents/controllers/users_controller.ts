import type { HttpContext } from '@adonisjs/core/http'
import {
  createTenantUserValidator,
  listTenantUsersValidator,
  updateTenantUserValidator,
} from '#modules/documents/validators/user'
import { userService } from '#modules/documents/services/user_service'

export default class UsersController {
  async index({ request, response }: HttpContext) {
    const tenantId = userService.requireTenantId()
    const { search, page, limit } = await request.validateUsing(listTenantUsersValidator, {
      data: request.qs(),
    })

    const result = await userService.list(tenantId, search, page, limit)
    return response.ok(result)
  }

  async assignableRoles({ response }: HttpContext) {
    const tenantId = userService.requireTenantId()
    const roles = await userService.listAssignableRoles(tenantId)
    return response.ok({ roles })
  }

  async store({ request, auth, response }: HttpContext) {
    const tenantId = userService.requireTenantId()
    const payload = await request.validateUsing(createTenantUserValidator)
    const result = await userService.create(tenantId, auth.user!.id, payload)

    return response.created({
      user: result.user,
      temporaryPassword: result.temporaryPassword,
      message: result.temporaryPassword
        ? 'User created. Share the temporary password securely — it is shown only once.'
        : 'User created successfully.',
    })
  }

  async update({ params, request, auth, response }: HttpContext) {
    const tenantId = userService.requireTenantId()
    const payload = await request.validateUsing(updateTenantUserValidator)
    const user = await userService.update(tenantId, auth.user!.id, params.id, payload)
    return response.ok({ user })
  }

  async destroy({ params, auth, response }: HttpContext) {
    const tenantId = userService.requireTenantId()
    await userService.deactivate(tenantId, auth.user!.id, params.id)
    return response.ok({ message: 'User deactivated successfully' })
  }
}
