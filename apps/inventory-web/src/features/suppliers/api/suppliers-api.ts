import { apiClient } from '@/lib/api-client'
import type { Supplier, SupplierFormData } from '../types'

interface ListParams {
  search?: string
  status?: string
  page?: number
  limit?: number
}

function mapSupplier(row: Record<string, unknown>): Supplier {
  const active = row.active === undefined ? true : Boolean(row.active)
  return {
    id: String(row.id ?? ''),
    name: String(row.name ?? ''),
    code: String(row.code ?? ''),
    contactPerson: String(row.contactPerson ?? row.contact_person ?? row.contactName ?? row.contact_name ?? ''),
    email: String(row.email ?? ''),
    phone: String(row.phone ?? ''),
    address: String(row.address ?? ''),
    tin: String(row.tin ?? ''),
    status: String(row.status ?? (active ? 'active' : 'inactive')),
    createdAt: String(row.createdAt ?? row.created_at ?? ''),
    updatedAt: String(row.updatedAt ?? row.updated_at ?? ''),
  }
}

function toApiPayload(payload: Partial<SupplierFormData>) {
  return {
    name: payload.name,
    code: payload.code,
    contactName: payload.contactPerson || undefined,
    email: payload.email || undefined,
    phone: payload.phone || undefined,
    address: payload.address || undefined,
    tin: payload.tin || undefined,
  }
}

export async function fetchSuppliers(
  params: ListParams = {},
): Promise<{ data: Supplier[]; meta: { total: number } }> {
  const { data } = await apiClient.get('/suppliers', { params })
  const rows = (data.data ?? []).map(mapSupplier)
  return { data: rows, meta: data.meta ?? { total: rows.length } }
}

export async function createSupplier(payload: SupplierFormData): Promise<Supplier> {
  const { data } = await apiClient.post('/suppliers', toApiPayload(payload))
  return mapSupplier(data.data ?? data)
}

export async function updateSupplier(id: string, payload: Partial<SupplierFormData>): Promise<Supplier> {
  const { data } = await apiClient.patch(`/suppliers/${id}`, toApiPayload(payload))
  return mapSupplier(data.data ?? data)
}

export async function deleteSupplier(id: string): Promise<void> {
  await apiClient.delete(`/suppliers/${id}`)
}
