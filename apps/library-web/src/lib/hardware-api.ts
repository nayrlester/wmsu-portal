import { apiClient } from '@/lib/api-client'
import type { ApiResponse } from '@/types/auth'
import type {
  KioskDevice,
  KioskTransaction,
  LocateResult,
  QueueAnalytics,
  QueueTicket,
  ShelfLocation,
  UpsertKioskPayload,
} from '@/types/hardware'

export async function fetchKiosks() {
  const { data } = await apiClient.get<ApiResponse<KioskDevice[]>>('/hardware/kiosks')
  return data.data
}

export async function upsertKiosk(payload: UpsertKioskPayload) {
  const { data } = await apiClient.post<ApiResponse<KioskDevice>>('/hardware/kiosks', payload)
  return data.data
}

export async function setKioskEnabled(id: string, isEnabled: boolean) {
  const { data } = await apiClient.patch<ApiResponse<KioskDevice>>(`/hardware/kiosks/${id}`, {
    isEnabled,
  })
  return data.data
}

export async function rotateKioskKey(id: string) {
  const { data } = await apiClient.post<ApiResponse<KioskDevice>>(
    `/hardware/kiosks/${id}/rotate-key`
  )
  return data.data
}

export async function fetchKioskTransactions(kioskId?: string, limit = 50) {
  const { data } = await apiClient.get<ApiResponse<KioskTransaction[]>>(
    '/hardware/kiosks/transactions',
    { params: { kioskId, limit } }
  )
  return data.data
}

export async function issueQueueTicket(payload: {
  serviceType: string
  patronName?: string
  memberId?: string
}) {
  const { data } = await apiClient.post<ApiResponse<QueueTicket>>('/hardware/queue/tickets', payload)
  return data.data
}

export async function callNextTicket(serviceType?: string) {
  const { data } = await apiClient.post<ApiResponse<QueueTicket>>('/hardware/queue/call-next', {
    serviceType,
  })
  return data.data
}

export async function completeQueueTicket(id: string) {
  const { data } = await apiClient.post<ApiResponse<QueueTicket>>(
    `/hardware/queue/tickets/${id}/complete`
  )
  return data.data
}

export async function fetchQueueAnalytics() {
  const { data } = await apiClient.get<ApiResponse<QueueAnalytics>>('/hardware/queue/analytics')
  return data.data
}

export async function fetchQueueBoard() {
  const { data } = await apiClient.get<ApiResponse<QueueTicket[]>>('/hardware/queue/board')
  return data.data
}

export async function fetchShelfLocations() {
  const { data } = await apiClient.get<ApiResponse<ShelfLocation[]>>('/hardware/locations')
  return data.data
}

export async function upsertShelfLocation(payload: {
  code: string
  label: string
  floor?: string
  aisle?: string
  shelf?: string
}) {
  const { data } = await apiClient.post<ApiResponse<ShelfLocation>>('/hardware/locations', payload)
  return data.data
}

export async function locateItem(q: string) {
  const { data } = await apiClient.get<ApiResponse<LocateResult[]>>('/hardware/locate', {
    params: { q },
  })
  return data.data
}
