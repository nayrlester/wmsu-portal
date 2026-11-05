import type { HttpContext } from '@adonisjs/core/http'
import { requisitionService } from '#modules/records/services/requisition_service'
import vine from '@vinejs/vine'

const createValidator = vine.compile(
  vine.object({
    requestingOfficeId: vine.string().uuid().optional(),
    purpose: vine.string().trim().optional(),
    lines: vine
      .array(
        vine.object({
          itemId: vine.string().uuid(),
          quantityRequested: vine.number().positive(),
          notes: vine.string().trim().optional(),
        })
      )
      .minLength(1),
  })
)

const approveValidator = vine.compile(
  vine.object({
    lines: vine
      .array(
        vine.object({
          lineId: vine.string().uuid(),
          quantityApproved: vine.number().min(0),
        })
      )
      .optional(),
  })
)

const fulfillValidator = vine.compile(
  vine.object({
    warehouseId: vine.string().uuid(),
    lines: vine
      .array(
        vine.object({
          lineId: vine.string().uuid(),
          quantityIssued: vine.number().positive(),
          binId: vine.string().uuid().optional(),
        })
      )
      .minLength(1),
  })
)

export default class RequisitionsController {
  async index({ auth, request, response }: HttpContext) {
    const result = await requisitionService.list(
      auth.user!.organizationId,
      request.input('page', 1),
      request.input('limit', 25),
      request.input('status')
    )
    return response.ok({ data: result.all(), meta: result.getMeta() })
  }

  async show({ auth, params, response }: HttpContext) {
    const row = await requisitionService.getById(auth.user!.organizationId, params.id)
    return response.ok({ data: row })
  }

  async store({ auth, request, response }: HttpContext) {
    const data = await request.validateUsing(createValidator)
    const row = await requisitionService.create(auth.user!.organizationId, data, auth.user!.id)
    return response.created({ data: row })
  }

  async submit({ auth, params, response }: HttpContext) {
    const row = await requisitionService.submit(auth.user!.organizationId, params.id, auth.user!.id)
    return response.ok({ data: row })
  }

  async approve({ auth, params, request, response }: HttpContext) {
    const data = await request.validateUsing(approveValidator)
    const row = await requisitionService.approve(
      auth.user!.organizationId,
      params.id,
      data,
      auth.user!.id
    )
    return response.ok({ data: row })
  }

  async reject({ auth, params, request, response }: HttpContext) {
    const row = await requisitionService.reject(
      auth.user!.organizationId,
      params.id,
      request.input('reason'),
      auth.user!.id
    )
    return response.ok({ data: row })
  }

  async fulfill({ auth, params, request, response }: HttpContext) {
    const data = await request.validateUsing(fulfillValidator)
    const row = await requisitionService.fulfill(
      auth.user!.organizationId,
      params.id,
      data,
      auth.user!.id
    )
    return response.ok({ data: row })
  }
}
