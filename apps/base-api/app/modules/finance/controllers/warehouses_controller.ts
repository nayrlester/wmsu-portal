import type { HttpContext } from '@adonisjs/core/http'
import { warehouseService } from '#modules/finance/services/warehouse_service'
import {
  createWarehouseValidator,
  updateWarehouseValidator,
  createWarehouseBinValidator,
} from '#modules/finance/validators/uims'

export default class WarehousesController {
  async index({ auth, response }: HttpContext) {
    const warehouses = await warehouseService.list(auth.user!.organizationId)
    return response.ok({ data: warehouses })
  }

  async show({ auth, params, response }: HttpContext) {
    const warehouse = await warehouseService.getById(auth.user!.organizationId, params.id)
    return response.ok({ data: warehouse })
  }

  async store({ auth, request, response }: HttpContext) {
    const data = await request.validateUsing(createWarehouseValidator)
    const warehouse = await warehouseService.create(auth.user!.organizationId, data)
    return response.created({ data: warehouse })
  }

  async update({ auth, params, request, response }: HttpContext) {
    const data = await request.validateUsing(updateWarehouseValidator)
    const warehouse = await warehouseService.update(auth.user!.organizationId, params.id, data)
    return response.ok({ data: warehouse })
  }

  async destroy({ auth, params, response }: HttpContext) {
    await warehouseService.delete(auth.user!.organizationId, params.id)
    return response.noContent()
  }

  // ── Bins ──

  async listBins({ params, response }: HttpContext) {
    const bins = await warehouseService.listBins(params.id)
    return response.ok({ data: bins })
  }

  async createBin({ params, request, response }: HttpContext) {
    const data = await request.validateUsing(createWarehouseBinValidator)
    const bin = await warehouseService.createBin(params.id, data)
    return response.created({ data: bin })
  }

  async deleteBin({ params, response }: HttpContext) {
    await warehouseService.deleteBin(params.id, params.binId)
    return response.noContent()
  }
}
