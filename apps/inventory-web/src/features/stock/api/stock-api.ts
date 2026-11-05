import { apiClient } from '@/lib/api-client'
import type { StockMovement, StockMovementFormData, StockBalance, StockLinesPayload } from '../types'

interface ListParams {
  itemId?: string
  warehouseId?: string
  type?: string
  page?: number
  limit?: number
}

function mapMovement(row: Record<string, unknown>): StockMovement {
  const typeRaw = String(row.type ?? '').toLowerCase()
  let type: StockMovement['type'] = 'ADJUST'
  if (typeRaw === 'receive' || typeRaw === 'beginning' || typeRaw === 'in') type = 'IN'
  else if (typeRaw === 'issue' || typeRaw === 'out') type = 'OUT'
  else if (typeRaw === 'return') type = 'RETURN'
  else if (typeRaw === 'disposal' || typeRaw === 'dispose') type = 'DISPOSAL'
  else if (typeRaw === 'reserve') type = 'RESERVE'
  else if (typeRaw === 'release') type = 'RELEASE'

  return {
    id: String(row.id ?? ''),
    itemId: String(row.itemId ?? row.item_id ?? ''),
    itemName: String(row.itemName ?? '—'),
    itemSku: String(row.itemSku ?? ''),
    warehouseId: String(row.warehouseId ?? row.warehouse_id ?? ''),
    warehouseName: String(row.warehouseName ?? '—'),
    type,
    quantity: Number(row.quantity ?? 0),
    reference: String(row.reference ?? ''),
    notes: String(row.notes ?? ''),
    createdBy: String(row.createdByUserId ?? row.created_by_user_id ?? ''),
    createdAt: String(row.createdAt ?? row.created_at ?? ''),
  }
}

function mapBalance(row: Record<string, unknown>): StockBalance {
  const onHand = Number(row.quantityOnHand ?? row.quantity_on_hand ?? row.quantity ?? 0)
  const reserved = Number(row.quantityReserved ?? row.quantity_reserved ?? 0)
  return {
    id: String(row.id ?? `${row.itemId}-${row.warehouseId}`),
    itemId: String(row.itemId ?? row.item_id ?? ''),
    itemName: String(row.itemName ?? row.item_name ?? '—'),
    itemSku: String(row.itemSku ?? row.item_sku ?? ''),
    warehouseId: String(row.warehouseId ?? row.warehouse_id ?? ''),
    warehouseName: String(row.warehouseName ?? row.warehouse_name ?? '—'),
    binCode: String(row.binCode ?? row.bin_code ?? ''),
    quantityOnHand: onHand,
    quantityReserved: reserved,
    quantityAvailable: Number(row.quantityAvailable ?? row.quantity_available ?? onHand - reserved),
    reorderLevel: Number(row.reorderLevel ?? row.reorder_level ?? 0),
  }
}

function linesBody(payload: StockMovementFormData, withReason = false): StockLinesPayload {
  return {
    lines: [
      {
        itemId: payload.itemId,
        warehouseId: payload.warehouseId,
        quantity: Math.abs(payload.quantity),
        ...(withReason ? { reason: payload.notes || payload.reference || 'Adjustment' } : {}),
      },
    ],
    reference: payload.reference || undefined,
    notes: payload.notes || undefined,
  }
}

export async function fetchStockMovements(
  params: ListParams = {},
): Promise<{ data: StockMovement[]; meta: { total: number } }> {
  const { data } = await apiClient.get('/stock/transactions', { params })
  const rows = (data.data ?? []).map(mapMovement)
  return { data: rows, meta: data.meta ?? { total: rows.length } }
}

export async function fetchStockBalances(
  params: { warehouseId?: string; search?: string } = {},
): Promise<{ data: StockBalance[]; meta: { total: number } }> {
  const { data } = await apiClient.get('/stock/balances', { params })
  const rows = (data.data ?? []).map(mapBalance)
  return { data: rows, meta: data.meta ?? { total: rows.length } }
}

export async function createStockMovement(payload: StockMovementFormData): Promise<StockMovement> {
  const endpointMap: Record<StockMovementFormData['type'], string> = {
    IN: '/stock/receive',
    OUT: '/stock/issue',
    ADJUST: '/stock/adjust',
    RETURN: '/stock/return',
    DISPOSAL: '/stock/disposal',
    RESERVE: '/stock/reserve',
    RELEASE: '/stock/release',
  }

  const endpoint = endpointMap[payload.type]
  let body: Record<string, unknown>
  if (payload.type === 'RESERVE') {
    body = {
      itemId: payload.itemId,
      warehouseId: payload.warehouseId,
      quantity: Math.abs(payload.quantity),
      reference: payload.reference || undefined,
    }
  } else if (payload.type === 'RELEASE') {
    body = {
      reservationId: payload.reference,
      quantity: Math.abs(payload.quantity),
    }
  } else {
    const withReason = payload.type === 'ADJUST' || payload.type === 'DISPOSAL'
    body = linesBody(payload, withReason) as unknown as Record<string, unknown>
  }

  const { data } = await apiClient.post(endpoint, body)
  const created = Array.isArray(data.data) ? data.data[0] : data.data
  return mapMovement(created ?? {})
}
