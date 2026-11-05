import { apiClient } from '@/lib/api-client'
import type { ApiResponse } from '@/types/auth'
import type { InAppNotification, NotificationPreference } from '@/types/notifications'

export async function fetchNotifications(page = 1) {
  const { data } = await apiClient.get<ApiResponse<InAppNotification[]>>('/notifications', {
    params: { page },
  })
  return { items: data.data, meta: data.meta }
}

export async function fetchUnreadCount() {
  const { data } = await apiClient.get<ApiResponse<{ count: number }>>('/notifications/unread-count')
  return data.data.count
}

export async function markNotificationRead(id: string) {
  const { data } = await apiClient.post<ApiResponse<InAppNotification>>(`/notifications/${id}/read`)
  return data.data
}

export async function markAllNotificationsRead() {
  const { data } = await apiClient.post<ApiResponse<{ updated: number }>>('/notifications/read-all')
  return data.data
}

export async function fetchNotificationPreferences() {
  const { data } = await apiClient.get<ApiResponse<NotificationPreference[]>>('/notifications/preferences')
  return data.data
}

export async function updateNotificationPreference(prefs: NotificationPreference) {
  const { data } = await apiClient.patch<ApiResponse<NotificationPreference>>('/notifications/preferences', prefs)
  return data.data
}
