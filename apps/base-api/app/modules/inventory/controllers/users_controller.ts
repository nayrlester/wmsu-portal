import type { HttpContext } from '@adonisjs/core/http'
import { userService } from '#modules/inventory/services/user_service'
import vine from '@vinejs/vine'

const createUserValidator = vine.compile(
  vine.object({
    email: vine.string().email().normalizeEmail(),
    password: vine.string().minLength(8),
    fullName: vine.string().minLength(2).maxLength(255),
    roleIds: vine.array(vine.string().uuid()).optional(),
  })
)

const updateUserValidator = vine.compile(
  vine.object({
    email: vine.string().email().normalizeEmail().optional(),
    fullName: vine.string().minLength(2).maxLength(255).optional(),
    password: vine.string().minLength(8).optional(),
    status: vine.string().in(['active', 'inactive']).optional(),
    roleIds: vine.array(vine.string().uuid()).optional(),
  })
)

export default class UsersController {
  async index({ auth, request, response }: HttpContext) {
    const page = request.input('page', 1)
    const limit = request.input('limit', 25)
    const users = await userService.list(auth.user!.organizationId, page, limit)
    return response.ok({ data: users.all(), meta: users.getMeta() })
  }

  async show({ auth, params, response }: HttpContext) {
    const user = await userService.getById(auth.user!.organizationId, params.id)
    return response.ok({ data: user })
  }

  async store({ auth, request, response }: HttpContext) {
    const data = await request.validateUsing(createUserValidator)
    const user = await userService.create({
      organizationId: auth.user!.organizationId,
      ...data,
    })
    return response.created({ data: user })
  }

  async update({ auth, params, request, response }: HttpContext) {
    const data = await request.validateUsing(updateUserValidator)
    const user = await userService.update(auth.user!.organizationId, params.id, data)
    return response.ok({ data: user })
  }

  async destroy({ auth, params, response }: HttpContext) {
    await userService.softDelete(auth.user!.organizationId, params.id)
    return response.noContent()
  }
}
