import { apiClient } from '@/lib/api-client'
import type { ApiResponse } from '@/types/auth'

export interface IntegrationChannelStatus {
  configured: boolean
  mode: string
  maxBatch?: number
  note?: string
}

export interface IntegrationsStatus {
  aris: IntegrationChannelStatus
  hris: IntegrationChannelStatus
  ldap: IntegrationChannelStatus
  smartCampusSso: IntegrationChannelStatus
}

export interface SyncResult {
  source: string
  created: number
  updated: number
  skipped: number
  received: number
}

export async function fetchIntegrationsStatus() {
  const { data } = await apiClient.get<ApiResponse<IntegrationsStatus>>('/integrations/status')
  return data.data
}

export async function syncEnrollmentStudents() {
  const { data } = await apiClient.post<ApiResponse<SyncResult>>('/integrations/enrollment/sync')
  return data.data
}

export async function syncArisStudents(students: unknown[]) {
  const { data } = await apiClient.post<ApiResponse<SyncResult>>('/integrations/aris/sync', {
    students,
  })
  return data.data
}

export async function syncHrisEmployees(employees: unknown[]) {
  const { data } = await apiClient.post<ApiResponse<SyncResult>>('/integrations/hris/sync', {
    employees,
  })
  return data.data
}
