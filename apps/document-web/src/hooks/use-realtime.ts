import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { env } from '@/shared/constants/env'
import {
  connectRealtimeSocket,
  disconnectRealtimeSocket,
  subscribeRealtimeEvent,
} from '@/lib/realtime-socket'

export function useRealtimeSync() {
  const queryClient = useQueryClient()

  useEffect(() => {
    const token = localStorage.getItem('accessToken')
    if (!token) return

    const base = env.apiUrl || window.location.origin
    let cancelled = false
    const unsubscribers: Array<() => void> = []

    void connectRealtimeSocket(token, base)
      .then(() => {
        if (cancelled) return

        unsubscribers.push(
          subscribeRealtimeEvent('socket:connected', () => {
            queryClient.invalidateQueries({ queryKey: ['notifications-unread'] })
            queryClient.invalidateQueries({ queryKey: ['notifications'] })
          }),
          subscribeRealtimeEvent('document:updated', () => {
            queryClient.invalidateQueries({ queryKey: ['documents'] })
            queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
          }),
          subscribeRealtimeEvent('notification:new', () => {
            queryClient.invalidateQueries({ queryKey: ['notifications'] })
            queryClient.invalidateQueries({ queryKey: ['notifications-unread'] })
          }),
          subscribeRealtimeEvent('approval:updated', () => {
            queryClient.invalidateQueries({ queryKey: ['pending-approvals'] })
          })
        )
      })
      .catch(() => {
        /* Socket unavailable — polling handles refresh */
      })

    return () => {
      cancelled = true
      unsubscribers.forEach((unsub) => unsub())
      disconnectRealtimeSocket()
    }
  }, [queryClient])
}
