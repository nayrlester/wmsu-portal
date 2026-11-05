import { apiClient } from '@/lib/api-client'
import type { ApiResponse } from '@/types/auth'
import type {
  InviteUserPayload,
  PaginatedMeta,
  StaffUser,
  UpdateUserPayload,
} from '@/types/users'

export async function fetchUsers(params: { page?: number; perPage?: number } = {}) {
  const { data } = await apiClient.get<ApiResponse<StaffUser[]> & { meta: PaginatedMeta }>(
    '/users',
    { params }
  )
  return { users: data.data, meta: data.meta }
}

export async function inviteUser(payload: InviteUserPayload) {
  const { data } = await apiClient.post<ApiResponse<StaffUser>>('/users', payload)
  return data.data
}

export async function updateUser(id: string, payload: UpdateUserPayload) {
  const { data } = await apiClient.patch<ApiResponse<StaffUser>>(`/users/${id}`, payload)
  return data.data
}
