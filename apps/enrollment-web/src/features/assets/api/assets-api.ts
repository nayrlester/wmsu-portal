import { apiClient } from '@/lib/api-client'
import type {
  Asset,
  AssetFormData,
  AssetAssignPayload,
  AssetReturnPayload,
  AssetMaintenancePayload,
  AssetRetirePayload,
} from '../types'

interface ListParams {
  search?: string
  status?: string
  category?: string
  page?: number
  limit?: number
}

/** Must match API createAssetValidator assetType enum. */
export const ASSET_TYPE_OPTIONS = [
  { value: 'it_hardware', label: 'IT / Computer Equipment' },
  { value: 'equipment', label: 'Equipment' },
  { value: 'furniture', label: 'Furniture & Fixtures' },
  { value: 'vehicle', label: 'Motor Vehicle' },
  { value: 'building', label: 'Building & Structures' },
  { value: 'other', label: 'Other' },
] as const

export const ASSET_STATUS_OPTIONS = [
  { value: 'available', label: 'Available' },
  { value: 'assigned', label: 'Assigned' },
  { value: 'in_maintenance', label: 'In Maintenance' },
  { value: 'retired', label: 'Retired' },
  { value: 'disposed', label: 'Disposed' },
] as const

const LEGACY_ASSET_TYPE: Record<string, string> = {
  computer: 'it_hardware',
  'lab-equipment': 'equipment',
  'office-equipment': 'equipment',
  land: 'other',
  'Computer Equipment': 'it_hardware',
  'Furniture & Fixtures': 'furniture',
  'Motor Vehicle': 'vehicle',
  'Laboratory Equipment': 'equipment',
  'Office Equipment': 'equipment',
  'Building & Structures': 'building',
  Land: 'other',
  Other: 'other',
}

const ASSET_TYPE_LABELS = Object.fromEntries(
  ASSET_TYPE_OPTIONS.map((o) => [o.value, o.label])
) as Record<string, string>

export function normalizeAssetType(raw: string | null | undefined): string {
  const value = String(raw ?? '').trim()
  if (!value) return 'equipment'
  if (LEGACY_ASSET_TYPE[value]) return LEGACY_ASSET_TYPE[value]
  if (ASSET_TYPE_OPTIONS.some((o) => o.value === value)) return value
  return 'other'
}

export function assetTypeLabel(value: string): string {
  const normalized = normalizeAssetType(value)
  return ASSET_TYPE_LABELS[normalized] ?? value
}

function mapAsset(row: Record<string, unknown>): Asset {
  const assignment = (row.currentAssignment ?? row.current_assignment) as
    Record<string, unknown> | undefined
  const assetType = normalizeAssetType(
    String(row.assetType ?? row.asset_type ?? row.category ?? '')
  )

  return {
    id: String(row.id ?? ''),
    tagNumber: String(row.assetCode ?? row.asset_code ?? row.tagNumber ?? ''),
    name: String(row.name ?? ''),
    description: String(row.description ?? ''),
    category: assetType,
    serialNumber: String(row.serialNumber ?? row.serial_number ?? ''),
    brand: String(row.brand ?? ''),
    model: String(row.model ?? ''),
    manufacturer: String(row.manufacturer ?? ''),
    fundSource: String(row.fundSource ?? row.fund_source ?? ''),
    acquisitionDate: String(row.purchaseDate ?? row.purchase_date ?? row.acquisitionDate ?? ''),
    acquisitionCost: Number(row.purchaseCost ?? row.purchase_cost ?? row.acquisitionCost ?? 0),
    warrantyExpiry: String(
      row.warrantyExpiresAt ?? row.warranty_expires_at ?? row.warrantyExpiry ?? ''
    ),
    location: String(row.officeId ?? row.office_id ?? row.location ?? ''),
    assignedTo: String(
      row.custodianName ??
        row.custodian_name ??
        assignment?.custodianName ??
        assignment?.custodian_name ??
        row.assignedTo ??
        row.assigned_to ??
        ''
    ),
    status: String(row.status ?? 'available'),
    createdAt: String(row.createdAt ?? row.created_at ?? ''),
    updatedAt: String(row.updatedAt ?? row.updated_at ?? ''),
  }
}

function toApiPayload(payload: Partial<AssetFormData>) {
  const notesParts = [
    payload.notes,
    payload.brand ? `Brand: ${payload.brand}` : null,
    payload.location ? `Location: ${payload.location}` : null,
  ].filter(Boolean)

  return {
    assetCode: payload.tagNumber,
    name: payload.name,
    description: payload.description || undefined,
    assetType: normalizeAssetType(payload.category),
    serialNumber: payload.serialNumber || undefined,
    model: payload.model || undefined,
    manufacturer: payload.manufacturer || undefined,
    fundSource: payload.fundSource || undefined,
    purchaseDate: payload.acquisitionDate || undefined,
    purchaseCost: payload.acquisitionCost,
    warrantyExpiresAt: payload.warrantyExpiry || undefined,
    notes: notesParts.length ? notesParts.join('\n') : undefined,
  }
}

export async function fetchAssets(
  params: ListParams = {}
): Promise<{ data: Asset[]; meta: { total: number } }> {
  const { data } = await apiClient.get('/assets', { params })
  const rows = (data.data ?? []).map(mapAsset)
  return { data: rows, meta: data.meta ?? { total: rows.length } }
}

export async function createAsset(payload: AssetFormData): Promise<Asset> {
  const { data } = await apiClient.post('/assets', toApiPayload(payload))
  const asset = mapAsset(data.data ?? data)

  const assignee = payload.assignedTo?.trim()
  if (assignee) {
    try {
      return await assignAsset(asset.id, {
        assignedTo: assignee,
        location: payload.location,
      })
    } catch {
      return asset
    }
  }

  return asset
}

export async function updateAsset(id: string, payload: Partial<AssetFormData>): Promise<Asset> {
  const { data } = await apiClient.patch(`/assets/${id}`, toApiPayload(payload))
  return mapAsset(data.data ?? data)
}

export async function deleteAsset(id: string): Promise<void> {
  await apiClient.delete(`/assets/${id}`)
}

export async function assignAsset(id: string, payload: AssetAssignPayload): Promise<Asset> {
  await apiClient.post(`/assets/${id}/assign`, {
    custodianExternalId: payload.assignedTo.slice(0, 64),
    custodianName: payload.assignedTo,
  })
  const { data } = await apiClient.get(`/assets/${id}`)
  return mapAsset(data.data ?? data)
}

export async function returnAsset(id: string, payload: AssetReturnPayload = {}): Promise<Asset> {
  const { data } = await apiClient.post(`/assets/${id}/return`, {
    returnNotes:
      [payload.location ? `Location: ${payload.location}` : null, payload.notes]
        .filter(Boolean)
        .join('\n') || undefined,
  })
  return mapAsset(data.data ?? data)
}

export async function retireAsset(id: string, payload: AssetRetirePayload): Promise<Asset> {
  const { data } = await apiClient.post(`/assets/${id}/retire`, {
    reason: payload.reason,
  })
  return mapAsset(data.data ?? data)
}

export async function scheduleAssetMaintenance(
  id: string,
  payload: AssetMaintenancePayload
): Promise<Asset> {
  const scheduledAt =
    payload.scheduledDate && payload.scheduledDate.length >= 10
      ? `${payload.scheduledDate}T09:00:00.000Z`
      : new Date().toISOString()

  await apiClient.post(`/assets/${id}/maintenance`, {
    title: payload.description.slice(0, 255),
    description: payload.notes || payload.description,
    scheduledAt,
    notes: payload.notes || undefined,
  })
  const { data } = await apiClient.get(`/assets/${id}`)
  return mapAsset(data.data ?? data)
}

export async function generateAssetQr(id: string): Promise<{ qrUrl: string; qrData: string }> {
  const { data } = await apiClient.post(`/assets/${id}/qr`)
  const payload = data.data ?? data
  return {
    qrUrl: String(payload.qrUrl ?? payload.qr_url ?? ''),
    qrData: String(payload.qrData ?? payload.qr_data ?? payload.qrPayload ?? payload.data ?? ''),
  }
}
