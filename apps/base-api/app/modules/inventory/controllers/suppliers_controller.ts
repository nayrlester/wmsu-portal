import type { HttpContext } from '@adonisjs/core/http'
import { supplierService } from '#modules/inventory/services/supplier_service'
import vine from '@vinejs/vine'

const supplierValidator = vine.compile(
  vine.object({
    code: vine.string().trim().minLength(1).maxLength(64),
    name: vine.string().trim().minLength(1).maxLength(255),
    contactName: vine.string().trim().maxLength(255).optional(),
    email: vine.string().email().optional(),
    phone: vine.string().trim().maxLength(64).optional(),
    address: vine.string().trim().maxLength(500).optional(),
    tin: vine.string().trim().maxLength(64).optional(),
    active: vine.boolean().optional(),
  })
)

export default class SuppliersController {
  async index({ auth, request, response }: HttpContext) {
    const result = await supplierService.list(
      auth.user!.organizationId,
      request.input('page', 1),
      request.input('limit', 25),
      request.input('activeOnly') === 'true' || request.input('activeOnly') === true
    )
    return response.ok({ data: result.all(), meta: result.getMeta() })
  }

  async show({ auth, params, response }: HttpContext) {
    const row = await supplierService.getById(auth.user!.organizationId, params.id)
    return response.ok({ data: row })
  }

  async store({ auth, request, response }: HttpContext) {
    const data = await request.validateUsing(supplierValidator)
    const row = await supplierService.create(auth.user!.organizationId, data)
    return response.created({ data: row })
  }

  async update({ auth, params, request, response }: HttpContext) {
    const data = await request.validateUsing(supplierValidator)
    const row = await supplierService.update(auth.user!.organizationId, params.id, data)
    return response.ok({ data: row })
  }

  async destroy({ auth, params, response }: HttpContext) {
    await supplierService.delete(auth.user!.organizationId, params.id)
    return response.ok({ data: { message: 'Deleted' } })
  }
}
