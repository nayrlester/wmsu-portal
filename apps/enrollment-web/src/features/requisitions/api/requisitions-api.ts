import { apiClient } from '@/lib/api-client'
import type { Requisition, RequisitionFormData, RequisitionLine } from '../types'

interface ListParams {
  status?: string
  search?: string
  page?: number
  limit?: number
}

function mapLine(row: Record<string, unknown>): RequisitionLine {
  return {
    id: String(row.id ?? ''),
    itemId: String(row.itemId ?? row.item_id ?? ''),
    itemName: String(row.itemName ?? row.item_name ?? ''),
    quantity: Number(row.quantityRequested ?? row.quantity_requested ?? row.quantity ?? 0),
    quantityApproved: Number(row.quantityApproved ?? row.quantity_approved ?? 0),
    unit: String(row.unit ?? row.uom ?? ''),
    notes: String(row.notes ?? ''),
  }
}

function mapRequisition(row: Record<string, unknown>): Requisition {
  const linesRaw = (row.lines as Record<string, unknown>[] | undefined) ?? []
  return {
    id: String(row.id ?? ''),
    number: String(row.number ?? row.requisitionNumber ?? row.requisition_number ?? ''),
    requestedBy: String(row.requestedBy ?? row.requested_by ?? ''),
    department: String(row.department ?? ''),
    purpose: String(row.purpose ?? ''),
    status: String(row.status ?? 'draft') as Requisition['status'],
    lines: linesRaw.map(mapLine),
    rejectionReason: String(row.rejectionReason ?? row.rejection_reason ?? ''),
    createdAt: String(row.createdAt ?? row.created_at ?? ''),
    updatedAt: String(row.updatedAt ?? row.updated_at ?? ''),
  }
}

export async function fetchRequisitions(
  params: ListParams = {}
): Promise<{ data: Requisition[]; meta: { total: number } }> {
  const { data } = await apiClient.get('/requisitions', { params })
  const rows = (data.data ?? []).map(mapRequisition)
  return { data: rows, meta: data.meta ?? { total: rows.length } }
}

export async function createRequisition(payload: RequisitionFormData): Promise<Requisition> {
  const { data } = await apiClient.post('/requisitions', {
    purpose: payload.department ? `[${payload.department}] ${payload.purpose}` : payload.purpose,
    lines: payload.lines.map((l) => ({
      itemId: l.itemId,
      quantityRequested: l.quantity,
      notes: l.notes,
    })),
  })
  return mapRequisition(data.data ?? data)
}

export async function submitRequisition(id: string): Promise<Requisition> {
  const { data } = await apiClient.post(`/requisitions/${id}/submit`)
  return mapRequisition(data.data ?? data)
}

export async function approveRequisition(id: string): Promise<Requisition> {
  const { data } = await apiClient.post(`/requisitions/${id}/approve`)
  return mapRequisition(data.data ?? data)
}

export async function rejectRequisition(id: string, reason?: string): Promise<Requisition> {
  const { data } = await apiClient.post(`/requisitions/${id}/reject`, { reason })
  return mapRequisition(data.data ?? data)
}

export async function fulfillRequisition(
  id: string,
  payload: {
    warehouseId: string
    lines: Array<{ lineId: string; quantityIssued: number; binId?: string }>
  }
): Promise<Requisition> {
  const { data } = await apiClient.post(`/requisitions/${id}/fulfill`, payload)
  return mapRequisition(data.data ?? data)
}

export async function fetchRequisition(id: string): Promise<Requisition> {
  const { data } = await apiClient.get(`/requisitions/${id}`)
  return mapRequisition(data.data ?? data)
}
