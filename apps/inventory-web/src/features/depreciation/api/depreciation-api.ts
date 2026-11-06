import { apiClient } from '@/lib/api-client'
import type {
  DepreciationProfile,
  DepreciationProfileFormData,
  DepreciationRunPayload,
  LapsingScheduleResult,
  LapsingScheduleRow,
  PropertyLedgerEntry,
} from '../types'

function mapProfile(row: Record<string, unknown>): DepreciationProfile {
  const asset = (row.asset as Record<string, unknown> | undefined) ?? {}
  return {
    id: String(row.id ?? ''),
    assetId: String(row.assetId ?? row.asset_id ?? asset.id ?? ''),
    assetCode: String(asset.assetCode ?? asset.asset_code ?? row.assetCode ?? ''),
    assetName: String(asset.name ?? row.assetName ?? ''),
    method: String(row.method ?? 'straight_line'),
    usefulLifeMonths: Number(row.usefulLifeMonths ?? row.useful_life_months ?? 0),
    residualRate: Number(row.residualRate ?? row.residual_rate ?? 0),
    acquisitionCost: Number(row.acquisitionCost ?? row.acquisition_cost ?? 0),
    inServiceDate: String(row.inServiceDate ?? row.in_service_date ?? ''),
    accumDepr: Number(row.accumDepr ?? row.accum_depr ?? 0),
    bookValue: Number(row.bookValue ?? row.book_value ?? 0),
    active: row.active === undefined ? true : Boolean(row.active),
    createdAt: String(row.createdAt ?? row.created_at ?? ''),
  }
}

function mapScheduleRow(row: Record<string, unknown>, idx: number): LapsingScheduleRow {
  return {
    id: `${row.periodYear}-${row.periodMonth}-${idx}`,
    periodYear: Number(row.periodYear ?? row.period_year ?? 0),
    periodMonth: Number(row.periodMonth ?? row.period_month ?? 0),
    deprAmount: Number(row.deprAmount ?? row.depr_amount ?? 0),
    accumDepr: Number(row.accumDepr ?? row.accum_depr ?? 0),
    bookValue: Number(row.bookValue ?? row.book_value ?? 0),
    posted: Boolean(row.posted),
  }
}

function mapLedger(row: Record<string, unknown>): PropertyLedgerEntry {
  const asset = (row.asset as Record<string, unknown> | undefined) ?? {}
  return {
    id: String(row.id ?? ''),
    assetId: String(row.assetId ?? row.asset_id ?? ''),
    assetCode: String(asset.assetCode ?? asset.asset_code ?? ''),
    assetName: String(asset.name ?? ''),
    entryType: String(row.entryType ?? row.entry_type ?? ''),
    reference: String(row.reference ?? ''),
    debit: Number(row.debit ?? 0),
    credit: Number(row.credit ?? 0),
    balanceAfter: Number(row.balanceAfter ?? row.balance_after ?? 0),
    narrative: String(row.narrative ?? ''),
    occurredAt: String(row.occurredAt ?? row.occurred_at ?? ''),
  }
}

/** Lookup profile for a specific asset (GET /depreciation/profiles/:assetId). */
export async function fetchDepreciationProfile(assetId: string): Promise<DepreciationProfile> {
  const { data } = await apiClient.get(`/depreciation/profiles/${assetId}`)
  return mapProfile(data.data ?? data)
}

export async function createDepreciationProfile(
  payload: DepreciationProfileFormData,
): Promise<DepreciationProfile> {
  const body = {
    assetId: payload.assetId,
    method: payload.method,
    usefulLifeMonths: payload.usefulLifeMonths,
    residualRate: payload.residualRate / 100,
    acquisitionCost: payload.acquisitionCost,
    inServiceDate: payload.inServiceDate,
  }
  const { data } = await apiClient.post('/depreciation/profiles', body)
  return mapProfile(data.data ?? data)
}

export async function runDepreciation(
  payload: DepreciationRunPayload,
): Promise<{ processed: number; ran: boolean; reason: string | null }> {
  const { data } = await apiClient.post('/depreciation/run', {
    periodYear: payload.periodYear,
    periodMonth: payload.periodMonth,
    assetId: payload.assetId || undefined,
  })
  const result = data.data ?? data
  const meta = (data.meta ?? {}) as { ran?: boolean; reason?: string | null }
  const processed = Array.isArray(result) ? result.length : Number(result.processed ?? result.count ?? 0)
  return { processed, ran: meta.ran !== false, reason: meta.reason ?? null }
}

export async function fetchLapsingSchedule(assetId: string): Promise<LapsingScheduleResult> {
  const { data } = await apiClient.get('/depreciation/lapsing-schedule', {
    params: { assetId },
  })
  const result = data.data ?? data
  const profile = mapProfile((result.profile as Record<string, unknown>) ?? {})
  const scheduleRaw = (result.schedule as Record<string, unknown>[] | undefined) ?? []
  return {
    profile,
    schedule: scheduleRaw.map(mapScheduleRow),
  }
}

export async function fetchPropertyLedger(params: {
  assetId?: string
  page?: number
  limit?: number
} = {}): Promise<{ data: PropertyLedgerEntry[]; meta: { total: number } }> {
  const { data } = await apiClient.get('/depreciation/property-ledger', { params })
  const rows = (data.data ?? []).map(mapLedger)
  return { data: rows, meta: data.meta ?? { total: rows.length } }
}
