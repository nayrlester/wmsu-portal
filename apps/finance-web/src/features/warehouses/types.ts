export interface WarehouseBin {
  id: string
  code: string
  name: string
  aisle: string
  shelf: string
  capacity: number
}

export interface WarehouseRecord {
  id: string
  name: string
  code: string
  address: string
  city: string
  province: string
  status: string
  itemCount: number
  bins: WarehouseBin[]
  createdAt: string
  updatedAt?: string
}

export interface WarehouseFormData {
  name: string
  code: string
  address: string
  city: string
  province: string
}

export interface BinFormData {
  code: string
  name: string
  aisle: string
  shelf: string
  capacity: number
}
