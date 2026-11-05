import { apiClient } from '@/lib/api-client'
import type { ApiResponse, PaginationMeta } from '@/types/auth'
import type { AuditLogEntry } from '@/types/audit'

export async function fetchAuditLogs(params: {
  page?: number
  action?: string
  resourceType?: string
  userId?: string
}) {
  const { data } = await apiClient.get<ApiResponse<AuditLogEntry[]>>('/audit-logs', { params })
  return { items: data.data, meta: data.meta as PaginationMeta | undefined }
}
