import { apiClient } from '@/api/client'
import { apiRequest } from '@/api/utils/request'
import type { AssignableRoleRecord, TenantUserRecord } from '@/types/api'

export interface CreateTenantUserInput {
  email: string
  fullName: string
  roleId: string
  password?: string
}

export interface UpdateTenantUserInput {
  fullName?: string
  status?: 'active' | 'inactive'
  roleId?: string
}

export interface CreateTenantUserResponse {
  user: TenantUserRecord
  temporaryPassword?: string
  message: string
}

export const usersApi = {
  list: (search?: string): Promise<{ users: TenantUserRecord[] }> =>
    apiRequest(
      apiClient.get<{ users: TenantUserRecord[] }>('/account/users', {
        params: search ? { search } : undefined,
      })
    ),

  assignableRoles: (): Promise<{ roles: AssignableRoleRecord[] }> =>
    apiRequest(apiClient.get<{ roles: AssignableRoleRecord[] }>('/account/users/assignable-roles')),

  create: (data: CreateTenantUserInput): Promise<CreateTenantUserResponse> =>
    apiRequest(apiClient.post<CreateTenantUserResponse>('/account/users', data)),

  update: (id: string, data: UpdateTenantUserInput): Promise<{ user: TenantUserRecord }> =>
    apiRequest(apiClient.put<{ user: TenantUserRecord }>(`/account/users/${id}`, data)),

  deactivate: (id: string): Promise<{ message: string }> =>
    apiRequest(apiClient.delete<{ message: string }>(`/account/users/${id}`)),
}
