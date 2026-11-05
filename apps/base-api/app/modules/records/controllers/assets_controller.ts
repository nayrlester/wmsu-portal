import type { HttpContext } from '@adonisjs/core/http'
import { assetService } from '#modules/records/services/asset_service'
import {
  createAssetValidator,
  updateAssetValidator,
  assignAssetValidator,
  completeReturnValidator,
  retireAssetValidator,
  scheduleMaintenanceValidator,
  completeMaintenanceValidator,
} from '#modules/records/validators/uims'

export default class AssetsController {
  async index({ auth, request, response }: HttpContext) {
    const page = request.input('page', 1)
    const limit = request.input('limit', 25)
    const status = request.input('status')
    const assets = await assetService.list(auth.user!.organizationId, page, limit, status)
    return response.ok({ data: assets.all(), meta: assets.getMeta() })
  }

  async show({ auth, params, response }: HttpContext) {
    const asset = await assetService.getById(auth.user!.organizationId, params.id)
    return response.ok({ data: asset })
  }

  async store({ auth, request, response }: HttpContext) {
    const data = await request.validateUsing(createAssetValidator)
    const asset = await assetService.create(auth.user!.organizationId, data, auth.user!.id)
    return response.created({ data: asset })
  }

  async update({ auth, params, request, response }: HttpContext) {
    const data = await request.validateUsing(updateAssetValidator)
    const asset = await assetService.update(auth.user!.organizationId, params.id, data, auth.user!.id)
    return response.ok({ data: asset })
  }

  async destroy({ auth, params, response }: HttpContext) {
    await assetService.softDelete(auth.user!.organizationId, params.id, auth.user!.id)
    return response.noContent()
  }

  async assign({ auth, params, request, response }: HttpContext) {
    const data = await request.validateUsing(assignAssetValidator)
    const assignment = await assetService.assign(auth.user!.organizationId, params.id, data, auth.user!.id)
    return response.created({ data: assignment })
  }

  async returnAsset({ auth, params, request, response }: HttpContext) {
    const data = await request.validateUsing(completeReturnValidator)
    const asset = await assetService.returnAsset(auth.user!.organizationId, params.id, data, auth.user!.id)
    return response.ok({ data: asset })
  }

  async retire({ auth, params, request, response }: HttpContext) {
    const data = await request.validateUsing(retireAssetValidator)
    const asset = await assetService.retire(auth.user!.organizationId, params.id, data.reason, auth.user!.id)
    return response.ok({ data: asset })
  }

  async scheduleMaintenance({ auth, params, request, response }: HttpContext) {
    const data = await request.validateUsing(scheduleMaintenanceValidator)
    const record = await assetService.scheduleMaintenance(auth.user!.organizationId, params.id, data, auth.user!.id)
    return response.created({ data: record })
  }

  async completeMaintenance({ auth, params, request, response }: HttpContext) {
    const data = await request.validateUsing(completeMaintenanceValidator)
    const record = await assetService.completeMaintenance(auth.user!.organizationId, params.maintenanceId, data)
    return response.ok({ data: record })
  }

  async generateQr({ auth, params, response }: HttpContext) {
    const asset = await assetService.generateQr(auth.user!.organizationId, params.id, auth.user!.id)
    return response.ok({ data: asset })
  }
}
