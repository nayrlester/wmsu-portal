export interface StockMovement {
  id: string
  itemId: string
  itemName: string
  itemSku: string
  warehouseId: string
  warehouseName: string
  type: 'IN' | 'OUT' | 'ADJUST' | 'RETURN' | 'DISPOSAL' | 'RESERVE' | 'RELEASE'
  quantity: number
  reference: string
  notes: string
  createdBy: string
  createdAt: string
}

export interface StockBalance {
  id: string
  itemId: string
  itemName: string
  itemSku: string
  warehouseId: string
  warehouseName: string
  binCode: string
  quantityOnHand: number
  quantityReserved: number
  quantityAvailable: number
  reorderLevel: number
}

export interface StockMovementFormData {
  itemId: string
  warehouseId: string
  type: 'IN' | 'OUT' | 'ADJUST' | 'RETURN' | 'DISPOSAL' | 'RESERVE' | 'RELEASE'
  quantity: number
  reference: string
  notes: string
}

export interface StockLinesPayload {
  lines: Array<{
    itemId: string
    warehouseId: string
    quantity: number
    reason?: string
  }>
  reference?: string
  notes?: string
}
