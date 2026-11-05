import { apiClient } from '@/api/client'
import { apiRequest } from '@/api/utils/request'

export type RecordRequestItem = {
  id: string
  status: string
  notes: string | null
  releasedAt: string | null
  returnedAt: string | null
  document: {
    id: string
    title?: string
    trackingNumber?: string
    status?: string
    confidentiality?: string
  }
}

export type ReleaseEvent = {
  id: string
  eventType: string
  notes: string | null
  metadata: Record<string, unknown> | null
  createdAt: string
  actor: { id: string; fullName: string | null; email: string } | null
  documentId: string | null
  itemId: string | null
}

export type RecordRequest = {
  id: string
  requestNumber: string
  status: string
  purpose: string
  accessMode: string
  notes: string | null
  denialReason: string | null
  neededBy: string | null
  dueAt: string | null
  isOverdue: boolean
  approvedAt: string | null
  releasedAt: string | null
  returnedAt: string | null
  cancelledAt: string | null
  createdAt: string
  updatedAt: string | null
  requestingOffice: { id: string; name: string } | null
  requester: { id: string; fullName: string | null; email: string } | null
  approver: { id: string; fullName: string | null; email: string } | null
  items: RecordRequestItem[]
  events?: ReleaseEvent[]
}

export type RecordRequestListResponse = {
  data: RecordRequest[]
  meta: {
    total: number
    perPage: number
    currentPage: number
    lastPage: number
  }
}

export type CreateRecordRequestInput = {
  purpose: string
  accessMode: 'view_only' | 'download' | 'physical_checkout'
  requestingOfficeId?: string
  neededBy?: string
  dueAt?: string
  notes?: string
  documentIds: string[]
}

export const recordRequestsApi = {
  list: (params?: {
    status?: string
    mine?: boolean
    overdue?: boolean
    page?: number
    limit?: number
  }): Promise<RecordRequestListResponse> =>
    apiRequest(apiClient.get('/account/record-requests', { params })),

  get: (id: string): Promise<{ data: RecordRequest }> =>
    apiRequest(apiClient.get(`/account/record-requests/${id}`)),

  create: (payload: CreateRecordRequestInput): Promise<{ data: RecordRequest }> =>
    apiRequest(apiClient.post('/account/record-requests', payload)),

  approve: (id: string): Promise<{ data: RecordRequest }> =>
    apiRequest(apiClient.post(`/account/record-requests/${id}/approve`)),

  deny: (id: string, reason: string): Promise<{ data: RecordRequest }> =>
    apiRequest(apiClient.post(`/account/record-requests/${id}/deny`, { reason })),

  release: (
    id: string,
    payload?: { itemIds?: string[]; notes?: string; dueAt?: string }
  ): Promise<{ data: RecordRequest }> =>
    apiRequest(apiClient.post(`/account/record-requests/${id}/release`, payload ?? {})),

  returnItems: (
    id: string,
    payload?: { itemIds?: string[]; notes?: string }
  ): Promise<{ data: RecordRequest }> =>
    apiRequest(apiClient.post(`/account/record-requests/${id}/return`, payload ?? {})),

  cancel: (id: string, reason?: string): Promise<{ data: RecordRequest }> =>
    apiRequest(apiClient.post(`/account/record-requests/${id}/cancel`, { reason })),
}
