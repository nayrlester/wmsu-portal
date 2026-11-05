import type { HttpContext } from '@adonisjs/core/http'
import { depreciationService } from '#modules/inventory/services/depreciation_service'
import { createDepreciationProfileValidator, runDepreciationValidator } from '#modules/inventory/validators/uims'

export default class DepreciationController {
  async createProfile({ auth, request, response }: HttpContext) {
    const data = await request.validateUsing(createDepreciationProfileValidator)
    const profile = await depreciationService.createProfile(
      auth.user!.organizationId,
      data,
      auth.user!.id
    )
    return response.created({ data: profile })
  }

  async getProfile({ auth, params, response }: HttpContext) {
    const profile = await depreciationService.getProfile(auth.user!.organizationId, params.assetId)
    return response.ok({ data: profile })
  }

  async run({ auth, request, response }: HttpContext) {
    const data = await request.validateUsing(runDepreciationValidator)
    const entries = await depreciationService.runPeriod(
      auth.user!.organizationId,
      data.periodYear,
      data.periodMonth,
      auth.user!.id,
      data.assetId
    )
    return response.ok({ data: entries })
  }

  async lapsingSchedule({ auth, request, response }: HttpContext) {
    const assetId = request.input('assetId')
    if (!assetId) return response.badRequest({ error: 'assetId query param required' })
    const result = await depreciationService.lapsingSchedule(auth.user!.organizationId, assetId)
    return response.ok({ data: result })
  }

  async propertyLedger({ auth, request, response }: HttpContext) {
    const assetId = request.input('assetId')
    const page = request.input('page', 1)
    const limit = request.input('limit', 50)
    const result = await depreciationService.listPropertyLedger(
      auth.user!.organizationId,
      assetId,
      page,
      limit
    )
    return response.ok({ data: result.all(), meta: result.getMeta() })
  }
}
