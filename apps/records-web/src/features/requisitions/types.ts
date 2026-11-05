export type RequisitionStatus =
  | 'draft'
  | 'submitted'
  | 'approved'
  | 'rejected'
  | 'fulfilled'
  | 'cancelled'

export interface RequisitionLine {
  id?: string
  itemId: string
  itemName?: string
  quantity: number
  quantityApproved?: number
  unit?: string
  notes?: string
}

export interface Requisition {
  id: string
  number: string
  requestedBy: string
  department: string
  purpose: string
  status: RequisitionStatus
  lines: RequisitionLine[]
  rejectionReason: string
  createdAt: string
  updatedAt: string
}

export interface RequisitionFormData {
  department: string
  purpose: string
  lines: Array<{ itemId: string; quantity: number; notes?: string }>
}
