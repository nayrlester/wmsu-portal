import { useEffect } from 'react'
import { useNotification, type NotificationItem } from '../components/notification'

type NotifyFn = (item: Omit<NotificationItem, 'id'> & { id?: string }) => string

let notifyFn: NotifyFn | null = null
let lastEmit: { key: string; at: number } | null = null

export function bindHttpNotifier(fn: NotifyFn | null) {
  notifyFn = fn
}

export function emitHttpNotify(item: Omit<NotificationItem, 'id'> & { id?: string }) {
  const key = `${item.tone ?? 'default'}|${item.title}|${item.description ?? ''}`
  const now = Date.now()
  if (lastEmit?.key === key && now - lastEmit.at < 2500) return
  lastEmit = { key, at: now }
  notifyFn?.(item)
}

export function HttpNotifyBootstrap() {
  const { notify } = useNotification()
  useEffect(() => {
    bindHttpNotifier(notify)
    return () => bindHttpNotifier(null)
  }, [notify])
  return null
}
