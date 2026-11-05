export interface Asset {
  id: string
  tagNumber: string
  name: string
  description: string
  category: string
  serialNumber: string
  brand: string
  model: string
  manufacturer: string
  fundSource: string
  acquisitionDate: string
  acquisitionCost: number
  warrantyExpiry: string
  location: string
  assignedTo: string
  status: string
  createdAt: string
  updatedAt: string
}

export interface AssetFormData {
  tagNumber: string
  name: string
  description: string
  category: string
  serialNumber: string
  brand: string
  model: string
  manufacturer: string
  fundSource: string
  acquisitionDate: string
  acquisitionCost: number
  warrantyExpiry: string
  location: string
  assignedTo: string
  status: string
  notes?: string
}

export interface AssetAssignPayload {
  assignedTo: string
  location?: string
  notes?: string
}

export interface AssetReturnPayload {
  location?: string
  notes?: string
}

export interface AssetMaintenancePayload {
  description: string
  scheduledDate?: string
  notes?: string
}

export interface AssetRetirePayload {
  reason: string
  notes?: string
}
