import { apiClient } from '@/api/client'
import { apiRequest, apiRequestVoid } from '@/api/utils/request'
import type { PaginatedMeta } from '@/types/api'

export interface NotificationRecord {
  id: string
  type: string
  title: string
  body: string
  data: Record<string, unknown> | null
  isRead: boolean
  readAt: string | null
  createdAt: string
}

export interface NotificationListResponse {
  notifications: NotificationRecord[]
  meta: PaginatedMeta
}

export const notificationsApi = {
  list: (params?: { page?: number; limit?: number }): Promise<NotificationListResponse> =>
    apiRequest(apiClient.get<NotificationListResponse>('/account/notifications', { params })),

  unreadCount: (): Promise<{ unreadCount: number }> =>
    apiRequest(apiClient.get<{ unreadCount: number }>('/account/notifications/unread-count')),

  markRead: (id: string): Promise<void> =>
    apiRequestVoid(apiClient.patch(`/account/notifications/${id}/read`)),

  markAllRead: (): Promise<void> =>
    apiRequestVoid(apiClient.post('/account/notifications/read-all')),
}
