export interface Item {
  id: string
  name: string
  sku: string
  description: string
  category: string
  unit: string
  reorderLevel: number
  currentStock: number
  unitCost: number
  brand: string
  model: string
  manufacturer: string
  fundSource: string
  barcode: string
  status: string
  createdAt: string
  updatedAt: string
}

export interface ItemFormData {
  name: string
  sku: string
  description: string
  category: string
  unit: string
  reorderLevel: number
  unitCost: number
  brand: string
  model: string
  manufacturer: string
  fundSource: string
  barcode: string
}
