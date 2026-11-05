import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { notificationsApi } from '@/lib/api'
import { isRealtimeConnected } from '@/lib/realtime-socket'

const POLL_MS = 60_000

function resolvePollInterval() {
  return isRealtimeConnected() ? false : POLL_MS
}

export function useNotificationUnread() {
  return useQuery({
    queryKey: ['notifications-unread'],
    queryFn: () => notificationsApi.unreadCount(),
    staleTime: 30_000,
    refetchInterval: resolvePollInterval,
  })
}

export function useNotifications(page = 1) {
  const unreadQuery = useNotificationUnread()
  return {
    unread: unreadQuery.data?.unreadCount ?? 0,
    ...useQuery({
      queryKey: ['notifications', page],
      queryFn: () => notificationsApi.list({ page, limit: 20 }),
      staleTime: 30_000,
      refetchInterval: resolvePollInterval,
    }),
  }
}

export function useMarkNotificationRead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => notificationsApi.markRead(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] })
      qc.invalidateQueries({ queryKey: ['notifications-unread'] })
    },
  })
}

export function useMarkAllNotificationsRead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => notificationsApi.markAllRead(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] })
      qc.invalidateQueries({ queryKey: ['notifications-unread'] })
    },
  })
}
