import { apiClient } from '@/api/client'
import { apiRequest } from '@/api/utils/request'

export type DigitizationBoard = {
  queued: number
  ocrRunning: number
  qaPending: number
  qaPassed: number
  qaFailed: number
  total: number
}

export type DigitizationItem = {
  id: string
  label: string
  status: string
  ocrQaStatus: string
  ocrConfidence: number | null
  ocrJobId: string | null
  pageCount: number | null
  contentHash: string | null
  primaryFileId: string | null
  indexingChecklist: Array<{ key: string; label: string; done: boolean }>
  physicalBoxId: string | null
  physicalFolderId: string | null
  qaNotes: string | null
  qaReviewedAt: string | null
  document: { id: string; title?: string; trackingNumber?: string } | null
}

export type DigitizationBatch = {
  id: string
  batchNumber: string
  title: string
  status: string
  notes: string | null
  completedAt: string | null
  createdAt: string
  createdBy: { id: string; fullName: string | null; email: string } | null
  board: DigitizationBoard
  items?: DigitizationItem[]
}

export type ReceivingReceipt = {
  id: string
  receiptNumber: string
  channel: string
  status: string
  title: string
  description: string | null
  senderName: string | null
  receivedAt: string
  physicalBoxId: string | null
  physicalFolderId: string | null
  acknowledgmentNotes: string | null
  createdAt: string
  receivedBy: { id: string; fullName: string | null; email: string } | null
  originatingOffice: { id: string; name: string } | null
  receivingOffice: { id: string; name: string } | null
  document: { id: string; title?: string; trackingNumber?: string } | null
  acknowledgment?: { heading: string; body: string }
}

export const digitizationApi = {
  list: (params?: { status?: string; page?: number }): Promise<{ data: DigitizationBatch[]; meta: unknown }> =>
    apiRequest(apiClient.get('/account/digitization/batches', { params })),

  get: (id: string): Promise<{ data: DigitizationBatch }> =>
    apiRequest(apiClient.get(`/account/digitization/batches/${id}`)),

  create: (payload: { title: string; notes?: string }): Promise<{ data: DigitizationBatch }> =>
    apiRequest(apiClient.post('/account/digitization/batches', payload)),

  addItem: (
    id: string,
    payload: {
      label: string
      documentId?: string
      physicalBoxId?: string
      physicalFolderId?: string
    }
  ): Promise<{ data: DigitizationBatch }> =>
    apiRequest(apiClient.post(`/account/digitization/batches/${id}/items`, payload)),

  runOcr: (id: string, itemId: string): Promise<{ data: DigitizationBatch }> =>
    apiRequest(apiClient.post(`/account/digitization/batches/${id}/items/${itemId}/ocr`)),

  ingest: (id: string, itemId: string, files: File[]): Promise<{ data: DigitizationBatch }> => {
    const form = new FormData()
    for (const file of files) {
      form.append('pages', file)
    }
    return apiRequest(
      apiClient.post(`/account/digitization/batches/${id}/items/${itemId}/ingest`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
    )
  },

  submitQa: (
    id: string,
    itemId: string,
    payload: {
      ocrQaStatus: string
      qaNotes?: string
      physicalBoxId?: string
      physicalFolderId?: string
      checklist?: Array<{ key: string; done: boolean }>
    }
  ): Promise<{ data: DigitizationBatch }> =>
    apiRequest(apiClient.post(`/account/digitization/batches/${id}/items/${itemId}/qa`, payload)),

  complete: (id: string): Promise<{ data: DigitizationBatch }> =>
    apiRequest(apiClient.post(`/account/digitization/batches/${id}/complete`)),
}

export const receivingApi = {
  list: (params?: {
    channel?: string
    status?: string
    date?: string
    page?: number
  }): Promise<{ data: ReceivingReceipt[]; meta: unknown }> =>
    apiRequest(apiClient.get('/account/receiving/receipts', { params })),

  get: (id: string): Promise<{ data: ReceivingReceipt }> =>
    apiRequest(apiClient.get(`/account/receiving/receipts/${id}`)),

  create: (payload: Record<string, unknown>): Promise<{ data: ReceivingReceipt }> =>
    apiRequest(apiClient.post('/account/receiving/receipts', payload)),

  register: (
    id: string,
    payload?: { documentId?: string; createDocument?: boolean }
  ): Promise<{ data: ReceivingReceipt }> =>
    apiRequest(apiClient.post(`/account/receiving/receipts/${id}/register`, payload ?? {})),

  acknowledgment: (id: string): Promise<{ data: Record<string, unknown> }> =>
    apiRequest(apiClient.get(`/account/receiving/receipts/${id}/acknowledgment`)),
}
