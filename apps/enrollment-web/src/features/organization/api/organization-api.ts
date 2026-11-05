import { apiClient } from '@/lib/api-client'
import type { Organization, Department } from '../types'

function mapOrg(row: Record<string, unknown>): Organization {
  return {
    id: String(row.id ?? ''),
    name: String(row.name ?? ''),
    slug: String(row.code ?? row.slug ?? ''),
    address: String(row.address ?? ''),
    contactEmail: String(row.contactEmail ?? row.contact_email ?? ''),
    contactPhone: String(row.contactPhone ?? row.contact_phone ?? ''),
    logoUrl: (row.logoUrl as string | null) ?? null,
  }
}

function mapDepartment(row: Record<string, unknown>): Department {
  return {
    id: String(row.id ?? ''),
    name: String(row.name ?? ''),
    code: String(row.code ?? ''),
    headName: String(row.headName ?? row.head_name ?? ''),
    createdAt: String(row.createdAt ?? row.created_at ?? ''),
  }
}

export async function fetchOrganization(): Promise<Organization> {
  const { data } = await apiClient.get('/org')
  return mapOrg(data.data ?? data)
}

export async function updateOrganization(
  payload: Partial<Pick<Organization, 'name' | 'address' | 'contactEmail' | 'contactPhone'>>
): Promise<Organization> {
  const { data } = await apiClient.patch('/org', {
    name: payload.name,
    address: payload.address || null,
    contactEmail: payload.contactEmail || null,
    contactPhone: payload.contactPhone || null,
  })
  return mapOrg(data.data ?? data)
}

export async function fetchDepartments(): Promise<Department[]> {
  const { data } = await apiClient.get('/org/departments')
  return (data.data ?? []).map(mapDepartment)
}

export async function createDepartment(
  payload: Pick<Department, 'name' | 'code' | 'headName'> & { campusId?: string }
): Promise<Department> {
  let campusId = payload.campusId
  if (!campusId) {
    const { data } = await apiClient.get('/org/campuses')
    campusId = data.data?.[0]?.id
  }
  if (!campusId) {
    throw new Error('Create a campus first before adding departments.')
  }

  const { data } = await apiClient.post('/org/departments', {
    campusId,
    name: payload.name,
    code: payload.code,
    headName: payload.headName || undefined,
  })
  return mapDepartment(data.data ?? data)
}

export async function updateDepartment(
  id: string,
  payload: Partial<Pick<Department, 'name' | 'code' | 'headName'>>
): Promise<Department> {
  const { data } = await apiClient.patch(`/org/departments/${id}`, {
    name: payload.name,
    code: payload.code,
    headName: payload.headName ?? null,
  })
  return mapDepartment(data.data ?? data)
}

export async function deleteDepartment(id: string): Promise<void> {
  await apiClient.delete(`/org/departments/${id}`)
}
