import { apiClient } from '@/lib/api-client'
import type {
  PhysicalCount,
  PhysicalCountDetail,
  CountFormData,
  CountScanPayload,
  CountLine,
} from '../types'

interface ListParams {
  status?: string
  warehouseId?: string
  page?: number
  limit?: number
}

function mapLine(row: Record<string, unknown>): CountLine {
  const systemQty = Number(row.systemQty ?? row.system_qty ?? 0)
  const countedQty = Number(row.countedQty ?? row.counted_qty ?? 0)
  return {
    id: String(row.id ?? ''),
    itemId: String(row.itemId ?? row.item_id ?? ''),
    itemName: String(row.itemName ?? row.item_name ?? ''),
    itemSku: String(row.itemSku ?? row.item_sku ?? ''),
    barcode: String(row.barcode ?? ''),
    systemQty,
    countedQty,
    variance: Number(row.variance ?? countedQty - systemQty),
    location: String(row.location ?? ''),
  }
}

function mapCount(row: Record<string, unknown>): PhysicalCount {
  return {
    id: String(row.id ?? ''),
    number: String(row.number ?? row.countNumber ?? row.count_number ?? ''),
    warehouseId: String(row.warehouseId ?? row.warehouse_id ?? ''),
    warehouseName: String(row.warehouseName ?? row.warehouse_name ?? '—'),
    status: String(row.status ?? 'draft') as PhysicalCount['status'],
    scheduledDate: String(row.scheduledDate ?? row.scheduled_date ?? ''),
    itemCount: Number(row.itemCount ?? row.item_count ?? 0),
    scannedCount: Number(row.scannedCount ?? row.scanned_count ?? 0),
    varianceCount: Number(row.varianceCount ?? row.variance_count ?? 0),
    createdAt: String(row.createdAt ?? row.created_at ?? ''),
    updatedAt: String(row.updatedAt ?? row.updated_at ?? ''),
  }
}

function mapDetail(row: Record<string, unknown>): PhysicalCountDetail {
  const linesRaw = (row.lines as Record<string, unknown>[] | undefined) ?? []
  return { ...mapCount(row), lines: linesRaw.map(mapLine) }
}

export async function fetchCounts(
  params: ListParams = {}
): Promise<{ data: PhysicalCount[]; meta: { total: number } }> {
  const { data } = await apiClient.get('/counts', { params })
  const rows = (data.data ?? []).map(mapCount)
  return { data: rows, meta: data.meta ?? { total: rows.length } }
}

export async function fetchCount(id: string): Promise<PhysicalCountDetail> {
  const { data } = await apiClient.get(`/counts/${id}`)
  return mapDetail(data.data ?? data)
}

export async function createCount(payload: CountFormData): Promise<PhysicalCount> {
  const { data } = await apiClient.post('/counts', payload)
  return mapCount(data.data ?? data)
}

export async function scanCount(id: string, payload: CountScanPayload): Promise<CountLine> {
  const photoUrl =
    payload.photoDataUrl && payload.photoDataUrl.length <= 500 ? payload.photoDataUrl : undefined
  const { data } = await apiClient.post(`/counts/${id}/scan`, {
    barcodeScanned: payload.barcode,
    countedQty: payload.quantity ?? 1,
    gpsLat: payload.latitude,
    gpsLng: payload.longitude,
    photoUrl,
    notes:
      [
        payload.scannedAt ? `scannedAt=${payload.scannedAt}` : '',
        payload.photoDataUrl && !photoUrl ? 'photo=queued-locally' : '',
      ]
        .filter(Boolean)
        .join('; ') || undefined,
  })
  return mapLine(data.data ?? data)
}

export async function reconcileCount(id: string): Promise<PhysicalCount> {
  const { data } = await apiClient.post(`/counts/${id}/reconcile`)
  return mapCount(data.data ?? data)
}

export async function closeCount(id: string): Promise<PhysicalCount> {
  const { data } = await apiClient.post(`/counts/${id}/close`)
  return mapCount(data.data ?? data)
}
