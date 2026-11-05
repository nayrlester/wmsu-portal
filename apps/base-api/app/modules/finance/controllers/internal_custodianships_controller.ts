import type { HttpContext } from '@adonisjs/core/http'
import { assetService } from '#modules/finance/services/asset_service'

export default class InternalCustodianshipsController {
  async index({ request, response }: HttpContext) {
    const employeeExternalId = request.input('employeeExternalId')
    if (!employeeExternalId) {
      return response.badRequest({ error: 'employeeExternalId query param required' })
    }

    const assets = await assetService.getCustodianships(employeeExternalId)
    return response.ok({
      data: assets.map((a) => ({
        externalEmployeeId: a.custodianExternalId ?? employeeExternalId,
        assetCode: a.assetCode,
        assetName: a.name,
        status: a.status,
      })),
    })
  }
}
