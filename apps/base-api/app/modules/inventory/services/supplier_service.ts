import Supplier from '#modules/inventory/models/supplier'

export class SupplierService {
  async list(orgId: string, page = 1, limit = 25, activeOnly = false) {
    const q = Supplier.query().where('organizationId', orgId)
    if (activeOnly) q.where('active', true)
    return q.orderBy('name').paginate(page, limit)
  }

  async getById(orgId: string, id: string) {
    return Supplier.query().where('organizationId', orgId).where('id', id).firstOrFail()
  }

  async create(orgId: string, data: Record<string, any>) {
    return Supplier.create({
      organizationId: orgId,
      code: data.code,
      name: data.name,
      contactName: data.contactName ?? null,
      email: data.email ?? null,
      phone: data.phone ?? null,
      address: data.address ?? null,
      tin: data.tin ?? null,
      active: data.active ?? true,
    })
  }

  async update(orgId: string, id: string, data: Record<string, any>) {
    const supplier = await this.getById(orgId, id)
    supplier.merge(data)
    await supplier.save()
    return supplier
  }

  async delete(orgId: string, id: string) {
    const supplier = await this.getById(orgId, id)
    await supplier.delete()
  }
}

export const supplierService = new SupplierService()
