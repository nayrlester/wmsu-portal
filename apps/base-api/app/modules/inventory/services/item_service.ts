import Item from '#modules/inventory/models/item'
import ItemCategory from '#modules/inventory/models/item_category'

export class ItemService {
  // ── Categories ──

  async listCategories(orgId: string) {
    return ItemCategory.query().where('organizationId', orgId).orderBy('name')
  }

  async createCategory(orgId: string, data: { name: string; code: string }) {
    return ItemCategory.create({ organizationId: orgId, ...data })
  }

  async getCategory(orgId: string, id: string) {
    return ItemCategory.query().where('organizationId', orgId).where('id', id).firstOrFail()
  }

  async updateCategory(orgId: string, id: string, data: Partial<{ name: string; code: string }>) {
    const cat = await this.getCategory(orgId, id)
    cat.merge(data)
    await cat.save()
    return cat
  }

  async deleteCategory(orgId: string, id: string) {
    const cat = await this.getCategory(orgId, id)
    await cat.delete()
  }

  // ── Items ──

  async listItems(orgId: string, page = 1, limit = 25, categoryId?: string) {
    const q = Item.query()
      .where('organizationId', orgId)
      .whereNull('deletedAt')
      .preload('category')
      .preload('stockBalances')
    if (categoryId) q.where('categoryId', categoryId)
    return q.orderBy('name').paginate(page, limit)
  }

  async getItem(orgId: string, id: string) {
    return Item.query()
      .where('organizationId', orgId)
      .where('id', id)
      .whereNull('deletedAt')
      .preload('category')
      .preload('stockBalances')
      .firstOrFail()
  }

  async createItem(orgId: string, data: Record<string, any>) {
    return Item.create({
      organizationId: orgId,
      sku: data.sku,
      barcode: data.barcode ?? null,
      name: data.name,
      uom: data.uom ?? 'pc',
      categoryId: data.categoryId ?? null,
      fundSource: data.fundSource ?? null,
      brand: data.brand ?? null,
      model: data.model ?? null,
      manufacturer: data.manufacturer ?? null,
      minStock: data.minStock ?? 0,
      maxStock: data.maxStock ?? null,
      reorderPoint: data.reorderPoint ?? null,
      valuationMethod: data.valuationMethod ?? 'weighted_average',
      supplierId: data.supplierId ?? null,
      safetyStock: data.safetyStock ?? 0,
      expiryTracked: data.expiryTracked ?? false,
      description: data.description ?? null,
    })
  }

  async updateItem(orgId: string, id: string, data: Record<string, any>) {
    const item = await Item.query()
      .where('organizationId', orgId)
      .where('id', id)
      .whereNull('deletedAt')
      .firstOrFail()
    item.merge(data)
    await item.save()
    return item
  }

  async deleteItem(orgId: string, id: string) {
    const item = await Item.query()
      .where('organizationId', orgId)
      .where('id', id)
      .whereNull('deletedAt')
      .firstOrFail()
    const { DateTime } = await import('luxon')
    item.deletedAt = DateTime.now()
    await item.save()
  }

  async importCsv(
    orgId: string,
    rows: Array<Record<string, string>>
  ): Promise<{ created: number; updated: number; errors: string[] }> {
    let created = 0
    let updated = 0
    const errors: string[] = []

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]!
      const line = i + 2
      const sku = (row.sku ?? row.SKU ?? '').trim()
      const name = (row.name ?? row.Name ?? '').trim()
      const uom = (row.uom ?? row.unit ?? row.UOM ?? 'pc').trim() || 'pc'
      if (!sku || !name) {
        errors.push(`Line ${line}: sku and name are required`)
        continue
      }

      try {
        const existing = await Item.query()
          .where('organizationId', orgId)
          .where('sku', sku)
          .whereNull('deletedAt')
          .first()

        const payload = {
          sku,
          name,
          uom,
          barcode: (row.barcode ?? row.Barcode ?? '').trim() || null,
          fundSource: (row.fundSource ?? row.fund_source ?? row.FundSource ?? '').trim() || null,
          brand: (row.brand ?? row.Brand ?? '').trim() || null,
          model: (row.model ?? row.Model ?? '').trim() || null,
          manufacturer: (row.manufacturer ?? row.Manufacturer ?? '').trim() || null,
          description: (row.description ?? row.Description ?? '').trim() || null,
          minStock: Number(row.minStock ?? row.min_stock ?? 0) || 0,
          reorderPoint: Number(row.reorderPoint ?? row.reorder_point ?? row.reorderLevel ?? 0) || null,
          safetyStock: Number(row.safetyStock ?? row.safety_stock ?? 0) || 0,
        }

        if (existing) {
          existing.merge(payload)
          await existing.save()
          updated += 1
        } else {
          await Item.create({ organizationId: orgId, ...payload, valuationMethod: 'weighted_average' })
          created += 1
        }
      } catch (err) {
        errors.push(`Line ${line}: ${err instanceof Error ? err.message : 'import failed'}`)
      }
    }

    return { created, updated, errors }
  }
}

export const itemService = new ItemService()
