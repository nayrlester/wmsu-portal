import { apiClient } from '@/lib/api-client'

export interface DashboardStats {
  totalItems: number
  totalWarehouses: number
  totalAssets: number
  totalStockValue: number
  lowStockCount: number
}

export interface RecentMovement {
  id: string
  itemName: string
  warehouseName: string
  type: string
  quantity: number
  reference: string
  createdAt: string
}

export interface LowStockAlert {
  id: string
  itemName: string
  sku: string
  currentStock: number
  reorderLevel: number
}

export interface NearExpiryAlert {
  id: string
  itemName: string
  sku: string
  currentStock: number
  expiresAt: string
}

export interface DashboardSummary {
  stats: DashboardStats
  lowStock: LowStockAlert[]
  nearExpiry: NearExpiryAlert[]
}

function mapLowStock(rows: unknown[]): LowStockAlert[] {
  return rows.map((row) => {
    const r = row as Record<string, unknown>
    return {
      id: String(r.id ?? ''),
      itemName: String(r.name ?? ''),
      sku: String(r.sku ?? ''),
      currentStock: Number(r.quantity ?? 0),
      reorderLevel: Number(r.min_stock ?? r.minStock ?? 0),
    }
  })
}

function mapNearExpiry(rows: unknown[]): NearExpiryAlert[] {
  return rows.map((row) => {
    const r = row as Record<string, unknown>
    return {
      id: String(r.id ?? ''),
      itemName: String(r.name ?? ''),
      sku: String(r.sku ?? ''),
      currentStock: Number(r.quantity ?? 0),
      expiresAt: String(r.expires_at ?? r.expiresAt ?? ''),
    }
  })
}

/** Single /dashboard/summary call — stats + alerts (do not fetch this endpoint 3x). */
export async function fetchDashboardSummary(): Promise<DashboardSummary> {
  const { data } = await apiClient.get('/dashboard/summary')
  const s = data.data ?? data
  const lowStock = mapLowStock(Array.isArray(s.lowStock) ? s.lowStock : [])
  const nearExpiry = mapNearExpiry(Array.isArray(s.nearExpiry) ? s.nearExpiry : [])

  return {
    stats: {
      totalItems: Number(s.items ?? 0),
      totalWarehouses: Number(s.warehouses ?? 0),
      totalAssets: Number(s.assets?.total ?? 0),
      totalStockValue: Number(s.stockValue ?? 0),
      lowStockCount: lowStock.length,
    },
    lowStock,
    nearExpiry,
  }
}

export async function fetchRecentMovements(): Promise<RecentMovement[]> {
  const { data } = await apiClient.get('/stock/transactions', {
    params: { page: 1, limit: 10 },
  })
  const rows = data.data ?? []
  return rows.map((row: Record<string, unknown>) => {
    const item = row.item as Record<string, unknown> | undefined
    const fromWh = row.fromWarehouse as Record<string, unknown> | undefined
    const toWh = row.toWarehouse as Record<string, unknown> | undefined
    const type = String(row.type ?? '')
    const inbound = ['receive', 'beginning', 'return'].includes(type)
    return {
      id: String(row.id ?? ''),
      itemName: String(row.itemName ?? item?.name ?? row.item_id ?? '—'),
      warehouseName: String(
        row.warehouseName ?? (inbound ? toWh?.name : fromWh?.name) ?? toWh?.name ?? fromWh?.name ?? '—'
      ),
      type: inbound ? 'IN' : type === 'transfer' ? 'TRANSFER' : 'OUT',
      quantity: Number(row.quantity ?? 0),
      reference: String(row.reference ?? ''),
      createdAt: String(row.createdAt ?? row.created_at ?? ''),
    }
  })
}
