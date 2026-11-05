import { useEffect } from 'react'
import { subscribeRealtimeEvent } from '@/lib/realtime-socket'
import { useCopilotStore } from '@/features/copilot/store/copilot-store'

export function useCopilotRealtime() {
  const pushActivity = useCopilotStore((s) => s.pushActivity)

  useEffect(() => {
    const unsubApproval = subscribeRealtimeEvent('approval:updated', (payload) => {
      const data = payload as { trackingNumber?: string; documentId?: string } | undefined
      pushActivity({
        id: crypto.randomUUID(),
        type: 'approval',
        title: 'Approval update',
        message: data?.trackingNumber
          ? `${data.trackingNumber} moved forward in the approval chain.`
          : 'Something changed on an approval.',
        timestamp: new Date().toISOString(),
        href: data?.documentId ? `/app/documents/${data.documentId}` : '/app/approvals',
      })
    })

    const unsubDocument = subscribeRealtimeEvent('document:updated', (payload) => {
      const data = payload as { trackingNumber?: string; documentId?: string } | undefined
      pushActivity({
        id: crypto.randomUUID(),
        type: 'document',
        title: 'Document updated',
        message: data?.trackingNumber
          ? `${data.trackingNumber} was just updated.`
          : 'A document was updated.',
        timestamp: new Date().toISOString(),
        href: data?.documentId ? `/app/documents/${data.documentId}` : undefined,
      })
    })

    const unsubNotification = subscribeRealtimeEvent('notification:new', () => {
      pushActivity({
        id: crypto.randomUUID(),
        type: 'notification',
        title: 'New alert',
        message: "You've got a new notification.",
        timestamp: new Date().toISOString(),
        href: '/app/notifications',
      })
    })

    return () => {
      unsubApproval()
      unsubDocument()
      unsubNotification()
    }
  }, [pushActivity])
}
