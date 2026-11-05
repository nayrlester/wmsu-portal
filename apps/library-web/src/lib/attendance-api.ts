import { apiClient } from '@/lib/api-client'
import type { ApiResponse } from '@/types/auth'
import type { PaginatedMeta } from '@/types/books'

export interface AttendanceEvent {
  id: string
  memberId: string | null
  memberName: string | null
  cardNumber: string
  direction: 'in' | 'out' | string
  source: 'desk' | 'kiosk' | 'import' | string
  occurredAt: string
  createdAt: string
}

export interface AttendanceSummary {
  date: string | null
  total: number
  checkIns: number
  checkOuts: number
  uniqueCards: number
}

export async function fetchAttendanceEvents(params: Record<string, unknown> = {}) {
  const { data } = await apiClient.get<ApiResponse<AttendanceEvent[]> & { meta: PaginatedMeta }>(
    '/attendance/events',
    { params }
  )
  return { events: data.data, meta: data.meta }
}

export async function fetchAttendanceSummary() {
  const { data } = await apiClient.get<ApiResponse<AttendanceSummary>>('/attendance/summary')
  return data.data
}

export async function createAttendanceEvent(payload: {
  cardNumber: string
  direction: 'in' | 'out'
  source?: 'desk' | 'kiosk' | 'import'
  occurredAt?: string
}) {
  const { data } = await apiClient.post<ApiResponse<AttendanceEvent>>('/attendance/events', payload)
  return data.data
}
