import type { HttpContext } from '@adonisjs/core/http'
import { physicalCountService } from '#modules/inventory/services/physical_count_service'
import { createCountSessionValidator, scanCountLineValidator } from '#modules/inventory/validators/uims'

export default class PhysicalCountsController {
  async index({ auth, request, response }: HttpContext) {
    const page = request.input('page', 1)
    const limit = request.input('limit', 25)
    const status = request.input('status')
    const result = await physicalCountService.list(auth.user!.organizationId, page, limit, status)
    return response.ok({ data: result.all(), meta: result.getMeta() })
  }

  async show({ auth, params, response }: HttpContext) {
    const session = await physicalCountService.getById(auth.user!.organizationId, params.id)
    return response.ok({ data: session })
  }

  async store({ auth, request, response }: HttpContext) {
    const data = await request.validateUsing(createCountSessionValidator)
    const session = await physicalCountService.create(auth.user!.organizationId, data, auth.user!.id)
    return response.created({ data: session })
  }

  async scan({ auth, params, request, response }: HttpContext) {
    const data = await request.validateUsing(scanCountLineValidator)
    const line = await physicalCountService.scanLine(
      auth.user!.organizationId,
      params.id,
      data,
      auth.user!.id
    )
    return response.created({ data: line })
  }

  async reconcile({ auth, params, response }: HttpContext) {
    const session = await physicalCountService.reconcile(
      auth.user!.organizationId,
      params.id,
      auth.user!.id
    )
    return response.ok({ data: session })
  }

  async close({ auth, params, response }: HttpContext) {
    const session = await physicalCountService.close(auth.user!.organizationId, params.id, auth.user!.id)
    return response.ok({ data: session })
  }
}
