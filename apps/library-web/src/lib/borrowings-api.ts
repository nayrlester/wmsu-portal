import { apiClient } from '@/lib/api-client'
import type { ApiResponse } from '@/types/auth'
import type { PaginatedMeta } from '@/types/books'
import type {
  Borrowing,
  BorrowingDashboard,
  BorrowingListParams,
  DirectCheckoutPayload,
  RequestBorrowPayload,
} from '@/types/borrowings'

export async function fetchBorrowingDashboard() {
  const { data } = await apiClient.get<ApiResponse<BorrowingDashboard>>('/borrowings/dashboard')
  return data.data
}

export async function fetchBorrowings(params: BorrowingListParams = {}) {
  const { data } = await apiClient.get<ApiResponse<Borrowing[]> & { meta: PaginatedMeta }>(
    '/borrowings',
    { params }
  )
  return { borrowings: data.data, meta: data.meta }
}

export async function fetchBorrowing(id: string) {
  const { data } = await apiClient.get<ApiResponse<Borrowing>>(`/borrowings/${id}`)
  return data.data
}

export async function requestBorrow(payload: RequestBorrowPayload) {
  const { data } = await apiClient.post<ApiResponse<Borrowing>>('/borrowings/request', payload)
  return data.data
}

export async function approveBorrowing(id: string, copyId?: string) {
  const { data } = await apiClient.post<ApiResponse<Borrowing>>(`/borrowings/${id}/approve`, {
    copyId,
  })
  return data.data
}

export async function checkoutBorrowing(id: string) {
  const { data } = await apiClient.post<ApiResponse<Borrowing>>(`/borrowings/${id}/checkout`)
  return data.data
}

export async function directCheckout(payload: DirectCheckoutPayload) {
  const { data } = await apiClient.post<ApiResponse<Borrowing>>('/borrowings/checkout', payload)
  return data.data
}

export async function returnBorrowing(id: string, notes?: string) {
  const { data } = await apiClient.post<ApiResponse<Borrowing>>(`/borrowings/${id}/return`, {
    notes,
  })
  return data.data
}

export async function markBorrowingLost(id: string) {
  const { data } = await apiClient.post<ApiResponse<Borrowing>>(`/borrowings/${id}/mark-lost`)
  return data.data
}

export async function renewBorrowing(id: string) {
  const { data } = await apiClient.post<ApiResponse<Borrowing>>(`/borrowings/${id}/renew`)
  return data.data
}
