import { apiClient } from '@/lib/api-client'
import type { Item, ItemFormData } from '../types'

interface ListParams {
  search?: string
  category?: string
  status?: string
  page?: number
  limit?: number
  lowStock?: boolean
}

function mapItem(row: Record<string, unknown>): Item {
  return {
    id: String(row.id ?? ''),
    name: String(row.name ?? ''),
    sku: String(row.sku ?? ''),
    description: String(row.description ?? ''),
    category: String(
      (row.category as { name?: string } | undefined)?.name ??
        row.categoryId ??
        row.category_id ??
        ''
    ),
    unit: String(row.uom ?? row.unit ?? ''),
    reorderLevel: Number(
      row.reorderPoint ?? row.reorder_point ?? row.minStock ?? row.min_stock ?? 0
    ),
    currentStock: Number(row.currentStock ?? 0),
    unitCost: Number(row.unitCost ?? 0),
    brand: String(row.brand ?? ''),
    model: String(row.model ?? ''),
    manufacturer: String(row.manufacturer ?? ''),
    fundSource: String(row.fundSource ?? row.fund_source ?? ''),
    barcode: String(row.barcode ?? ''),
    status: String(row.status ?? 'active'),
    createdAt: String(row.createdAt ?? row.created_at ?? ''),
    updatedAt: String(row.updatedAt ?? row.updated_at ?? ''),
  }
}

function toApiPayload(payload: Partial<ItemFormData>) {
  return {
    name: payload.name,
    sku: payload.sku,
    description: payload.description || undefined,
    uom: payload.unit,
    categoryId: payload.category || undefined,
    reorderPoint: payload.reorderLevel,
    minStock: payload.reorderLevel,
    unitCost: payload.unitCost,
    brand: payload.brand || undefined,
    model: payload.model || undefined,
    manufacturer: payload.manufacturer || undefined,
    fundSource: payload.fundSource || undefined,
    barcode: payload.barcode || undefined,
  }
}

export async function fetchItems(
  params: ListParams = {}
): Promise<{ data: Item[]; meta: { total: number } }> {
  const { data } = await apiClient.get('/items', { params })
  const rows = (data.data ?? []).map(mapItem)
  return { data: rows, meta: data.meta ?? { total: rows.length } }
}

export async function createItem(payload: ItemFormData): Promise<Item> {
  const { data } = await apiClient.post('/items', toApiPayload(payload))
  return mapItem(data.data ?? data)
}

export async function updateItem(id: string, payload: Partial<ItemFormData>): Promise<Item> {
  const { data } = await apiClient.patch(`/items/${id}`, toApiPayload(payload))
  return mapItem(data.data ?? data)
}

export async function deleteItem(id: string): Promise<void> {
  await apiClient.delete(`/items/${id}`)
}

export async function importItemsCsv(csv: string): Promise<{
  created: number
  updated: number
  errors: string[]
}> {
  const { data } = await apiClient.post('/items/import', { csv })
  const result = data.data ?? data
  return {
    created: Number(result.created ?? 0),
    updated: Number(result.updated ?? 0),
    errors: Array.isArray(result.errors) ? result.errors.map(String) : [],
  }
}
