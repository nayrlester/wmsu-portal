import Warehouse from '#modules/enrollment/models/warehouse'
import WarehouseBin from '#modules/enrollment/models/warehouse_bin'

export class WarehouseService {
  async list(orgId: string) {
    return Warehouse.query().where('organizationId', orgId).preload('campus').preload('bins').orderBy('name')
  }

  async getById(orgId: string, id: string) {
    return Warehouse.query()
      .where('organizationId', orgId)
      .where('id', id)
      .preload('campus')
      .preload('bins')
      .firstOrFail()
  }

  async create(orgId: string, data: { campusId: string; name: string; code: string }) {
    return Warehouse.create({ organizationId: orgId, ...data })
  }

  async update(orgId: string, id: string, data: Partial<{ campusId: string; name: string; code: string }>) {
    const wh = await Warehouse.query().where('organizationId', orgId).where('id', id).firstOrFail()
    wh.merge(data)
    await wh.save()
    return wh
  }

  async delete(orgId: string, id: string) {
    const wh = await Warehouse.query().where('organizationId', orgId).where('id', id).firstOrFail()
    await wh.delete()
  }

  // ── Bins ──

  async listBins(warehouseId: string) {
    return WarehouseBin.query().where('warehouseId', warehouseId).orderBy('binCode')
  }

  async createBin(warehouseId: string, data: Record<string, any>) {
    return WarehouseBin.create({
      warehouseId,
      binCode: data.binCode,
      zone: data.zone ?? null,
      rack: data.rack ?? null,
      shelf: data.shelf ?? null,
      capacity: data.capacity ?? null,
    })
  }

  async deleteBin(warehouseId: string, binId: string) {
    const bin = await WarehouseBin.query()
      .where('warehouseId', warehouseId)
      .where('id', binId)
      .firstOrFail()
    await bin.delete()
  }
}

export const warehouseService = new WarehouseService()
