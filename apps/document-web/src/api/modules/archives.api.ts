import { apiClient } from '@/api/client'
import { apiRequest } from '@/api/utils/request'

export type ArchivalTransfer = {
  id: string
  transferNumber: string
  title: string
  status: string
  notes: string | null
  approvedAt: string | null
  completedAt: string | null
  createdAt: string
  createdBy: { id: string; fullName: string | null; email: string } | null
  approvedBy: { id: string; fullName: string | null; email: string } | null
  items: Array<{
    id: string
    document: {
      id: string
      title?: string
      trackingNumber?: string
      lifecycleStatus?: string
    }
  }>
}

export type DisposalRequest = {
  id: string
  requestNumber: string
  title: string
  status: string
  justification: string
  certificateNumber: string | null
  certificateNotes: string | null
  approvedAt: string | null
  disposedAt: string | null
  createdAt: string
  createdBy: { id: string; fullName: string | null; email: string } | null
  approvedBy: { id: string; fullName: string | null; email: string } | null
  items: Array<{
    id: string
    document: {
      id: string
      title?: string
      trackingNumber?: string
      lifecycleStatus?: string
    }
  }>
}

export const archivesApi = {
  listTransfers: (params?: { status?: string; page?: number }) =>
    apiRequest<{ data: ArchivalTransfer[]; meta: unknown }>(
      apiClient.get('/account/archives/transfers', { params })
    ),

  createTransfer: (payload: { title: string; notes?: string; documentIds: string[] }) =>
    apiRequest<{ data: ArchivalTransfer }>(apiClient.post('/account/archives/transfers', payload)),

  approveTransfer: (id: string) =>
    apiRequest<{ data: ArchivalTransfer }>(
      apiClient.post(`/account/archives/transfers/${id}/approve`)
    ),

  completeTransfer: (id: string) =>
    apiRequest<{ data: ArchivalTransfer }>(
      apiClient.post(`/account/archives/transfers/${id}/complete`)
    ),

  listDisposals: (params?: { status?: string; page?: number }) =>
    apiRequest<{ data: DisposalRequest[]; meta: unknown }>(
      apiClient.get('/account/archives/disposals', { params })
    ),

  createDisposal: (payload: {
    title: string
    justification: string
    documentIds: string[]
  }) =>
    apiRequest<{ data: DisposalRequest }>(apiClient.post('/account/archives/disposals', payload)),

  approveDisposal: (id: string) =>
    apiRequest<{ data: DisposalRequest }>(
      apiClient.post(`/account/archives/disposals/${id}/approve`)
    ),

  executeDisposal: (id: string, notes?: string) =>
    apiRequest<{ data: DisposalRequest }>(
      apiClient.post(`/account/archives/disposals/${id}/execute`, { notes })
    ),

  setLegalHold: (documentId: string, payload: { hold: boolean; reason: string }) =>
    apiRequest<{ data: Record<string, unknown> }>(
      apiClient.post(`/account/documents/${documentId}/legal-hold`, payload)
    ),
}
