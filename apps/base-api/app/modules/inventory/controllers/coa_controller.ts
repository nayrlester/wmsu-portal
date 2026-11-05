import type { HttpContext } from '@adonisjs/core/http'
import { coaService } from '#modules/inventory/services/coa_service'
import { createCoaValidator, updateCoaValidator } from '#modules/inventory/validators/uims'

export default class CoaController {
  async index({ auth, request, response }: HttpContext) {
    const page = request.input('page', 1)
    const limit = request.input('limit', 25)
    const formType = request.input('formType')
    const status = request.input('status')
    const result = await coaService.list(auth.user!.organizationId, page, limit, formType, status)
    return response.ok({ data: result.all(), meta: result.getMeta() })
  }

  async show({ auth, params, response }: HttpContext) {
    const doc = await coaService.getById(auth.user!.organizationId, params.id)
    return response.ok({ data: doc })
  }

  async store({ auth, request, response }: HttpContext) {
    const data = await request.validateUsing(createCoaValidator)
    const doc = await coaService.create(auth.user!.organizationId, data, auth.user!.id)
    return response.created({ data: doc })
  }

  async update({ auth, params, request, response }: HttpContext) {
    const data = await request.validateUsing(updateCoaValidator)
    const doc = await coaService.update(auth.user!.organizationId, params.id, data, auth.user!.id)
    return response.ok({ data: doc })
  }

  async approve({ auth, params, response }: HttpContext) {
    const doc = await coaService.approve(auth.user!.organizationId, params.id, auth.user!.id)
    return response.ok({ data: doc })
  }

  async export({ auth, params, request, response }: HttpContext) {
    const format = (request.input('format', 'pdf') as string).toLowerCase() as 'pdf' | 'csv' | 'html'
    const result = await coaService.export(auth.user!.organizationId, params.id, format)

    response.header('Content-Disposition', `attachment; filename="${result.filename}"`)
    if (Buffer.isBuffer(result.body)) {
      return response.header('Content-Type', result.contentType).send(result.body)
    }
    return response.header('Content-Type', result.contentType).send(result.body)
  }
}
