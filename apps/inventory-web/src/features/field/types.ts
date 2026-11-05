export interface FieldQueueItem {
  id: string
  countId: string
  barcode: string
  quantity: number
  latitude?: number
  longitude?: number
  photoDataUrl?: string
  scannedAt: string
  synced: boolean
  error?: string
}

export const FIELD_QUEUE_KEY = 'uims-field-queue'
