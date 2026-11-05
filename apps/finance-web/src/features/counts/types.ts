export type CountStatus = 'draft' | 'in_progress' | 'reconciling' | 'closed' | 'cancelled'

export interface PhysicalCount {
  id: string
  number: string
  warehouseId: string
  warehouseName: string
  status: CountStatus
  scheduledDate: string
  itemCount: number
  scannedCount: number
  varianceCount: number
  createdAt: string
  updatedAt: string
}

export interface CountLine {
  id: string
  itemId: string
  itemName: string
  itemSku: string
  barcode: string
  systemQty: number
  countedQty: number
  variance: number
  location?: string
}

export interface PhysicalCountDetail extends PhysicalCount {
  lines: CountLine[]
}

export interface CountFormData {
  warehouseId: string
  scheduledDate: string
  notes?: string
}

export interface CountScanPayload {
  barcode: string
  quantity?: number
  latitude?: number
  longitude?: number
  photoDataUrl?: string
  scannedAt?: string
}
