import type { HttpContext } from '@adonisjs/core/http'
import {
  createReceivingReceiptValidator,
  listReceivingReceiptsValidator,
  registerReceivingReceiptValidator,
} from '#modules/documents/validators/digitization_receiving'
import { receivingService } from '#modules/documents/services/receiving_service'

export default class ReceivingController {
  async index({ request, response }: HttpContext) {
    const filters = await request.validateUsing(listReceivingReceiptsValidator, {
      data: request.qs(),
    })
    return response.ok(await receivingService.list(filters))
  }

  async show({ params, response }: HttpContext) {
    return response.ok({ data: await receivingService.show(params.id) })
  }

  async store({ request, auth, response }: HttpContext) {
    const payload = await request.validateUsing(createReceivingReceiptValidator)
    const data = await receivingService.create(payload, auth.user!)
    return response.created({ data })
  }

  async register({ params, request, auth, response }: HttpContext) {
    const payload = await request.validateUsing(registerReceivingReceiptValidator)
    const data = await receivingService.register(params.id, payload, auth.user!)
    return response.ok({ data })
  }

  async acknowledgment({ params, response }: HttpContext) {
    return response.ok({ data: await receivingService.acknowledgment(params.id) })
  }
}
