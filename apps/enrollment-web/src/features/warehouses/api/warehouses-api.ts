import { apiClient } from '@/lib/api-client'
import type { WarehouseRecord, WarehouseFormData, WarehouseBin, BinFormData } from '../types'

interface ListParams {
  search?: string
  status?: string
  page?: number
  limit?: number
}

function mapBin(row: Record<string, unknown>): WarehouseBin {
  return {
    id: String(row.id ?? ''),
    code: String(row.code ?? ''),
    name: String(row.name ?? ''),
    aisle: String(row.aisle ?? ''),
    shelf: String(row.shelf ?? ''),
    capacity: Number(row.capacity ?? 0),
  }
}

function mapWarehouse(row: Record<string, unknown>): WarehouseRecord {
  const binsRaw = (row.bins as Record<string, unknown>[] | undefined) ?? []
  return {
    id: String(row.id ?? ''),
    name: String(row.name ?? ''),
    code: String(row.code ?? ''),
    address: String(row.address ?? ''),
    city: String(row.city ?? ''),
    province: String(row.province ?? ''),
    itemCount: Number(row.itemCount ?? 0),
    status: String(row.status ?? 'active'),
    bins: binsRaw.map(mapBin),
    createdAt: String(row.createdAt ?? row.created_at ?? ''),
    updatedAt: String(row.updatedAt ?? row.updated_at ?? ''),
  }
}

export async function fetchWarehouses(
  params: ListParams = {}
): Promise<{ data: WarehouseRecord[]; meta: { total: number } }> {
  const { data } = await apiClient.get('/warehouses', { params })
  const rows = (data.data ?? []).map(mapWarehouse)
  return { data: rows, meta: data.meta ?? { total: rows.length } }
}

export async function createWarehouse(payload: WarehouseFormData): Promise<WarehouseRecord> {
  const { data: campusesRes } = await apiClient.get('/org/campuses')
  const campusId = campusesRes.data?.[0]?.id
  if (!campusId) {
    throw new Error('Create a campus first before adding warehouses.')
  }

  const { data } = await apiClient.post('/warehouses', {
    name: payload.name,
    code: payload.code,
    campusId,
    address: payload.address || undefined,
    city: payload.city || undefined,
    province: payload.province || undefined,
  })
  return mapWarehouse(data.data ?? data)
}

export async function updateWarehouse(
  id: string,
  payload: Partial<WarehouseFormData>
): Promise<WarehouseRecord> {
  const { data } = await apiClient.patch(`/warehouses/${id}`, {
    name: payload.name,
    code: payload.code,
    address: payload.address || undefined,
    city: payload.city || undefined,
    province: payload.province || undefined,
  })
  return mapWarehouse(data.data ?? data)
}

export async function deleteWarehouse(id: string): Promise<void> {
  await apiClient.delete(`/warehouses/${id}`)
}

export async function fetchWarehouseBins(warehouseId: string): Promise<WarehouseBin[]> {
  const { data } = await apiClient.get(`/warehouses/${warehouseId}/bins`)
  const rows = data.data ?? data ?? []
  return (Array.isArray(rows) ? rows : []).map(mapBin)
}

export async function createWarehouseBin(
  warehouseId: string,
  payload: BinFormData
): Promise<WarehouseBin> {
  const { data } = await apiClient.post(`/warehouses/${warehouseId}/bins`, payload)
  return mapBin(data.data ?? data)
}

export async function updateWarehouseBin(
  warehouseId: string,
  binId: string,
  payload: Partial<BinFormData>
): Promise<WarehouseBin> {
  const { data } = await apiClient.patch(`/warehouses/${warehouseId}/bins/${binId}`, payload)
  return mapBin(data.data ?? data)
}

export async function deleteWarehouseBin(warehouseId: string, binId: string): Promise<void> {
  await apiClient.delete(`/warehouses/${warehouseId}/bins/${binId}`)
}
