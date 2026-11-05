import { apiClient } from '@/lib/api-client'
import type { ApiResponse } from '@/types/auth'
import type { PaginatedMeta } from '@/types/books'

export interface Reservation {
  id: string
  memberId: string
  memberName?: string | null
  bookId: string
  bookTitle?: string | null
  copyId: string | null
  status: 'pending' | 'ready' | 'fulfilled' | 'cancelled' | 'expired'
  queuePosition: number | null
  reservedAt: string
  readyAt: string | null
  expiresAt: string | null
  fulfilledAt: string | null
  cancelledAt: string | null
  cancelReason: string | null
}

export async function fetchReservations(params: Record<string, unknown> = {}) {
  const { data } = await apiClient.get<ApiResponse<Reservation[]> & { meta: PaginatedMeta }>(
    '/reservations',
    { params }
  )
  return { reservations: data.data, meta: data.meta }
}

export async function createReservation(payload: {
  memberId: string
  bookId: string
  reservedAt?: string
  expiresAt?: string
}) {
  const { data } = await apiClient.post<ApiResponse<Reservation>>('/reservations', payload)
  return data.data
}

export async function cancelReservation(id: string, reason?: string) {
  const { data } = await apiClient.post<ApiResponse<Reservation>>(`/reservations/${id}/cancel`, {
    reason,
  })
  return data.data
}

export async function fulfillReservation(id: string) {
  const { data } = await apiClient.post<ApiResponse<Reservation>>(`/reservations/${id}/fulfill`)
  return data.data
}
