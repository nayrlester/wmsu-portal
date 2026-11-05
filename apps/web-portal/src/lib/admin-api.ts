import { apiClient } from '@/lib/api-client'
import type { ApiResponse } from '@/types/auth'
import type {
  AdminPlatform,
  AdminRole,
  AdminUser,
  CreateUserPayload,
  UpdateUserPayload,
} from '@/types/admin'

export async function listUsers() {
  const res = await apiClient.get<ApiResponse<AdminUser[]>>('/admin/users')
  return res.data.data
}

export async function createUser(payload: CreateUserPayload) {
  const res = await apiClient.post<ApiResponse<AdminUser>>('/admin/users', payload)
  return res.data.data
}

export async function updateUser(id: string, payload: UpdateUserPayload) {
  const res = await apiClient.patch<ApiResponse<AdminUser>>(`/admin/users/${id}`, payload)
  return res.data.data
}

export async function listRoles() {
  const res = await apiClient.get<ApiResponse<AdminRole[]>>('/admin/roles')
  return res.data.data
}

export async function listPlatforms() {
  const res = await apiClient.get<ApiResponse<AdminPlatform[]>>('/admin/platforms')
  return res.data.data
}
