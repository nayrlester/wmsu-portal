import { apiClient } from '@/lib/api-client'
import type { ApiResponse } from '@/types/auth'
import type {
  Member,
  MemberCardData,
  MemberDetail,
  MemberListParams,
  CreateMemberPayload,
  UpdateMemberPayload,
  PaginatedMeta,
  BorrowingHistoryResponse,
} from '@/types/members'

export async function fetchMembers(params: MemberListParams = {}) {
  const { data } = await apiClient.get<ApiResponse<Member[]> & { meta: PaginatedMeta }>(
    '/members',
    { params }
  )
  return { members: data.data, meta: data.meta }
}

export async function fetchPendingMembers() {
  const { data } = await apiClient.get<
    ApiResponse<{ count: number; members: Member[] }>
  >('/members/pending')
  return data.data
}

export async function fetchMember(id: string) {
  const { data } = await apiClient.get<ApiResponse<MemberDetail>>(`/members/${id}`)
  return data.data
}

export async function createMember(payload: CreateMemberPayload) {
  const { data } = await apiClient.post<ApiResponse<Member>>('/members', payload)
  return data.data
}

export async function updateMember(id: string, payload: UpdateMemberPayload) {
  const { data } = await apiClient.patch<ApiResponse<Member>>(`/members/${id}`, payload)
  return data.data
}

export async function deleteMember(id: string) {
  await apiClient.delete(`/members/${id}`)
}

export async function approveMember(id: string) {
  const { data } = await apiClient.post<ApiResponse<Member>>(`/members/${id}/approve`)
  return data.data
}

export async function rejectMember(id: string, reason?: string) {
  const { data } = await apiClient.post<ApiResponse<Member>>(`/members/${id}/reject`, {
    reason,
  })
  return data.data
}

export async function fetchMemberCard(id: string) {
  const { data } = await apiClient.get<ApiResponse<MemberCardData>>(`/members/${id}/card`)
  return data.data
}

export async function fetchBorrowingHistory(id: string) {
  const { data } = await apiClient.get<ApiResponse<BorrowingHistoryResponse>>(
    `/members/${id}/borrowing-history`
  )
  return data.data
}
