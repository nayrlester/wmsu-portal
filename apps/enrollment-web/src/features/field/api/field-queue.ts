import type { FieldQueueItem } from '../types'
import { FIELD_QUEUE_KEY } from '../types'
import { scanCount } from '@/features/counts/api/counts-api'

export function loadFieldQueue(): FieldQueueItem[] {
  try {
    const raw = localStorage.getItem(FIELD_QUEUE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as FieldQueueItem[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function saveFieldQueue(items: FieldQueueItem[]): void {
  localStorage.setItem(FIELD_QUEUE_KEY, JSON.stringify(items))
}

export function enqueueScan(item: Omit<FieldQueueItem, 'id' | 'synced'>): FieldQueueItem {
  const entry: FieldQueueItem = { ...item, id: crypto.randomUUID(), synced: false }
  const queue = loadFieldQueue()
  queue.unshift(entry)
  saveFieldQueue(queue)
  return entry
}

export async function syncFieldQueue(): Promise<{ synced: number; failed: number }> {
  const queue = loadFieldQueue()
  let synced = 0
  let failed = 0

  for (const item of queue) {
    if (item.synced) continue
    try {
      await scanCount(item.countId, {
        barcode: item.barcode,
        quantity: item.quantity,
        latitude: item.latitude,
        longitude: item.longitude,
        photoDataUrl: item.photoDataUrl,
        scannedAt: item.scannedAt,
      })
      item.synced = true
      item.error = undefined
      synced += 1
    } catch (err) {
      item.error = err instanceof Error ? err.message : 'Sync failed'
      failed += 1
    }
  }

  saveFieldQueue(queue)
  return { synced, failed }
}

export function clearSyncedQueue(): void {
  const remaining = loadFieldQueue().filter((i) => !i.synced)
  saveFieldQueue(remaining)
}
