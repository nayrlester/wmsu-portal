import type { HttpContext } from '@adonisjs/core/http'
import { rbacService } from '#modules/enrollment/services/rbac_service'
import vine from '@vinejs/vine'

const createRoleValidator = vine.compile(
  vine.object({
    slug: vine.string().minLength(2).maxLength(64).alphaNumeric({ allowDashes: true, allowUnderscores: true }),
    name: vine.string().minLength(2).maxLength(255),
    permissionIds: vine.array(vine.string().uuid()).optional(),
  })
)

const updateRoleValidator = vine.compile(
  vine.object({
    name: vine.string().minLength(2).maxLength(255).optional(),
    permissionIds: vine.array(vine.string().uuid()).optional(),
  })
)

export default class RolesController {
  async index({ auth, response }: HttpContext) {
    const roles = await rbacService.listRoles(auth.user!.organizationId)
    return response.ok({ data: roles })
  }

  async show({ auth, params, response }: HttpContext) {
    const role = await rbacService.getRole(auth.user!.organizationId, params.id)
    return response.ok({ data: role })
  }

  async store({ auth, request, response }: HttpContext) {
    const data = await request.validateUsing(createRoleValidator)
    const role = await rbacService.createRole(auth.user!.organizationId, data)
    return response.created({ data: role })
  }

  async update({ auth, params, request, response }: HttpContext) {
    const data = await request.validateUsing(updateRoleValidator)
    const role = await rbacService.updateRole(auth.user!.organizationId, params.id, data)
    return response.ok({ data: role })
  }

  async destroy({ auth, params, response }: HttpContext) {
    await rbacService.deleteRole(auth.user!.organizationId, params.id)
    return response.noContent()
  }
}
