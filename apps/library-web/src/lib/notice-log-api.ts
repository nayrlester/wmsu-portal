import { apiClient } from '@/lib/api-client'
import type { ApiResponse, PaginationMeta } from '@/types/auth'

export interface NoticeLogEntry {
  id: string
  eventType: string
  channel: string
  title: string
  status: string
  failedReason: string | null
  sentAt: string | null
  createdAt: string
}

export async function fetchNoticeLog(page = 1) {
  const { data } = await apiClient.get<ApiResponse<NoticeLogEntry[]>>('/notifications/delivery-log', {
    params: { page, perPage: 20 },
  })
  return { items: data.data, meta: data.meta as PaginationMeta | undefined }
}
