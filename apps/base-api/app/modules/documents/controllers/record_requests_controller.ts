import type { HttpContext } from '@adonisjs/core/http'
import {
  cancelRecordRequestValidator,
  createRecordRequestValidator,
  denyRecordRequestValidator,
  listRecordRequestsValidator,
  releaseRecordRequestValidator,
  returnRecordRequestValidator,
} from '#modules/documents/validators/record_request'
import { recordRequestService } from '#modules/documents/services/record_request_service'

export default class RecordRequestsController {
  private async canManageDesk(auth: HttpContext['auth']) {
    const user = auth.user!
    return user.hasPermission('records.release.manage', user.tenantId)
  }

  async index({ request, auth, response }: HttpContext) {
    const filters = await request.validateUsing(listRecordRequestsValidator, {
      data: request.qs(),
    })
    const canManage = await this.canManageDesk(auth)
    const result = await recordRequestService.list(filters, auth.user!, canManage)
    return response.ok(result)
  }

  async show({ params, auth, response }: HttpContext) {
    const canManage = await this.canManageDesk(auth)
    const data = await recordRequestService.show(params.id, auth.user!, canManage)
    return response.ok({ data })
  }

  async store({ request, auth, response }: HttpContext) {
    const payload = await request.validateUsing(createRecordRequestValidator)
    const data = await recordRequestService.create(payload, auth.user!)
    return response.created({ data })
  }

  async approve({ params, auth, response }: HttpContext) {
    const data = await recordRequestService.approve(params.id, auth.user!)
    return response.ok({ data })
  }

  async deny({ params, request, auth, response }: HttpContext) {
    const payload = await request.validateUsing(denyRecordRequestValidator)
    const data = await recordRequestService.deny(params.id, auth.user!, payload.reason)
    return response.ok({ data })
  }

  async release({ params, request, auth, response }: HttpContext) {
    const payload = await request.validateUsing(releaseRecordRequestValidator)
    const data = await recordRequestService.release(params.id, auth.user!, payload)
    return response.ok({ data })
  }

  async returnItems({ params, request, auth, response }: HttpContext) {
    const payload = await request.validateUsing(returnRecordRequestValidator)
    const data = await recordRequestService.returnItems(params.id, auth.user!, payload)
    return response.ok({ data })
  }

  async cancel({ params, request, auth, response }: HttpContext) {
    const payload = await request.validateUsing(cancelRecordRequestValidator)
    const canManage = await this.canManageDesk(auth)
    const data = await recordRequestService.cancel(
      params.id,
      auth.user!,
      canManage,
      payload.reason
    )
    return response.ok({ data })
  }
}
