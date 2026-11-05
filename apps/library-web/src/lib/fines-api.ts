import { apiClient } from '@/lib/api-client'
import type { ApiResponse } from '@/types/auth'
import type { PaginatedMeta } from '@/types/books'
import type {
  CollectFinePayload,
  CreateManualFinePayload,
  Fine,
  FineListParams,
  FineSummary,
  WaiveFinePayload,
} from '@/types/fines'

export async function fetchFineSummary() {
  const { data } = await apiClient.get<ApiResponse<FineSummary>>('/fines/summary')
  return data.data
}

export async function fetchFines(params: FineListParams = {}) {
  const { data } = await apiClient.get<ApiResponse<Fine[]> & { meta: PaginatedMeta }>('/fines', {
    params,
  })
  return { fines: data.data, meta: data.meta }
}

export async function createManualFine(payload: CreateManualFinePayload) {
  const { data } = await apiClient.post<ApiResponse<Fine>>('/fines', payload)
  return data.data
}

export async function waiveFine(id: string, payload: WaiveFinePayload) {
  const { data } = await apiClient.post<ApiResponse<Fine>>(`/fines/${id}/waive`, payload)
  return data.data
}

export async function collectFine(id: string, payload: CollectFinePayload) {
  const { data } = await apiClient.post<ApiResponse<Fine>>(`/fines/${id}/collect`, payload)
  return data.data
}

export async function adjustFine(id: string, amountCents: number, notes?: string) {
  const { data } = await apiClient.patch<ApiResponse<Fine>>(`/fines/${id}`, { amountCents, notes })
  return data.data
}
