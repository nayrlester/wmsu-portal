import { apiClient } from '@/lib/api-client'
import type { ApiResponse } from '@/types/auth'
import type { Borrowing } from '@/types/borrowings'
import type { Reservation } from '@/lib/reservations-api'

export interface PortalAccount {
  member: {
    id: string
    fullName: string
    email: string | null
    libraryCardNumber: string
    memberType: string
    membershipStatus: string
    isBlacklisted: boolean
    isEnrolled: boolean
    membershipExpiresAt: string | null
  }
  activeLoans: Borrowing[]
  reservations: Reservation[]
  outstandingFines: Array<{
    id: string
    balanceCents: number
    reason: string
    bookTitle?: string | null
  }>
  canBorrow: boolean
}

export interface ReadingListItem {
  id: string
  bookId: string
  title: string | null
  position: number
}

export interface ReadingList {
  id: string
  name: string
  description: string | null
  isPublic: boolean
  items: ReadingListItem[]
}

export async function fetchPortalMe() {
  const { data } = await apiClient.get<ApiResponse<PortalAccount>>('/portal/me')
  return data.data
}

export async function portalRenewLoan(id: string) {
  const { data } = await apiClient.post(`/portal/loans/${id}/renew`)
  return data.data
}

export async function portalReserve(bookId: string) {
  const { data } = await apiClient.post('/portal/reservations', { bookId })
  return data.data
}

export async function fetchReadingLists() {
  const { data } = await apiClient.get<ApiResponse<ReadingList[]>>('/portal/reading-lists')
  return data.data
}

export async function createReadingList(name: string, description?: string) {
  const { data } = await apiClient.post<ApiResponse<ReadingList>>('/portal/reading-lists', {
    name,
    description,
  })
  return data.data
}

export async function addReadingListItem(listId: string, bookId: string) {
  const { data } = await apiClient.post<ApiResponse<ReadingList>>(
    `/portal/reading-lists/${listId}/items`,
    { bookId }
  )
  return data.data
}

export async function deleteReadingList(listId: string) {
  const { data } = await apiClient.delete(`/portal/reading-lists/${listId}`)
  return data
}

export async function removeReadingListItem(listId: string, itemId: string) {
  const { data } = await apiClient.delete<ApiResponse<ReadingList>>(
    `/portal/reading-lists/${listId}/items/${itemId}`
  )
  return data.data
}
