import { apiClient } from '@/lib/api-client'
import type { ApiResponse } from '@/types/auth'
import type { PaginatedMeta } from '@/types/books'

export type AcquisitionStatus =
  | 'draft'
  | 'submitted'
  | 'routed'
  | 'acknowledged'
  | 'cataloged'
  | 'cancelled'

export interface AcquisitionRequest {
  id: string
  requestNumber: string
  status: AcquisitionStatus
  title: string
  authors: string | null
  isbn13: string | null
  materialType: string | null
  publisherName: string | null
  publicationYear: number | null
  quantity: number
  justification: string | null
  requestingUnit: string | null
  notes: string | null
  memberId: string | null
  memberName: string | null
  bookId: string | null
  bookTitle: string | null
  catalogedBookId: string | null
  catalogedBookTitle: string | null
  ufmsPrRef: string | null
  outboxId: string | null
  submittedAt: string | null
  routedAt: string | null
  acknowledgedAt: string | null
  catalogedAt: string | null
  cancelledAt: string | null
  cancelReason: string | null
  createdAt: string
  updatedAt: string | null
}

export interface AcquisitionDashboard {
  draftCount: number
  submittedCount: number
  routedCount: number
  acknowledgedCount: number
  catalogedCount: number
  cancelledCount: number
  pendingRouteCount: number
  byStatus: Record<string, number>
  recent: AcquisitionRequest[]
  ownershipNote: string
}

export type AcquisitionPayload = {
  title: string
  authors?: string
  isbn13?: string
  materialType?: string
  publisherName?: string
  publicationYear?: number
  quantity?: number
  justification?: string
  requestingUnit?: string
  notes?: string
  memberId?: string
  bookId?: string
}

export async function fetchAcquisitionDashboard() {
  const { data } = await apiClient.get<ApiResponse<AcquisitionDashboard>>('/acquisitions/dashboard')
  return data.data
}

export async function fetchAcquisitions(params: Record<string, unknown> = {}) {
  const { data } = await apiClient.get<ApiResponse<AcquisitionRequest[]> & { meta: PaginatedMeta }>(
    '/acquisitions',
    { params }
  )
  return { items: data.data, meta: data.meta }
}

export async function createAcquisition(payload: AcquisitionPayload) {
  const { data } = await apiClient.post<ApiResponse<AcquisitionRequest>>('/acquisitions', payload)
  return data.data
}

export async function updateAcquisition(id: string, payload: Partial<AcquisitionPayload>) {
  const { data } = await apiClient.patch<ApiResponse<AcquisitionRequest>>(
    `/acquisitions/${id}`,
    payload
  )
  return data.data
}

export async function submitAcquisition(id: string) {
  const { data } = await apiClient.post<ApiResponse<AcquisitionRequest>>(
    `/acquisitions/${id}/submit`
  )
  return data.data
}

export async function routeAcquisition(id: string) {
  const { data } = await apiClient.post<ApiResponse<AcquisitionRequest>>(
    `/acquisitions/${id}/route`
  )
  return data.data
}

export async function acknowledgeAcquisition(id: string, ufmsPrRef: string) {
  const { data } = await apiClient.post<ApiResponse<AcquisitionRequest>>(
    `/acquisitions/${id}/acknowledge`,
    { ufmsPrRef }
  )
  return data.data
}

export async function linkAcquisitionCatalog(id: string, catalogedBookId: string) {
  const { data } = await apiClient.post<ApiResponse<AcquisitionRequest>>(
    `/acquisitions/${id}/link-catalog`,
    { catalogedBookId }
  )
  return data.data
}

export async function cancelAcquisition(id: string, reason?: string) {
  const { data } = await apiClient.post<ApiResponse<AcquisitionRequest>>(
    `/acquisitions/${id}/cancel`,
    { reason }
  )
  return data.data
}
