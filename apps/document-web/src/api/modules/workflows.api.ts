import { apiClient } from '@/api/client'
import { apiRequest, apiRequestVoid } from '@/api/utils/request'
import type { WorkflowRecord } from '@/shared/types'
import type { PaginatedResponse } from '@/types/api'
import type { ApiListParams } from '@/api/types'

export interface CreateWorkflowInput {
  name: string
  description?: string
  definition: unknown
}

export interface UpdateWorkflowInput {
  name?: string
  description?: string
  definition?: unknown
}

export const workflowsApi = {
  list: (
    params?: ApiListParams
  ): Promise<{ workflows: WorkflowRecord[]; meta: PaginatedResponse<WorkflowRecord>['meta'] }> =>
    apiRequest(
      apiClient.get<{ workflows: WorkflowRecord[]; meta: PaginatedResponse<WorkflowRecord>['meta'] }>(
        '/account/workflows',
        { params }
      )
    ),

  get: (id: string): Promise<{ workflow: WorkflowRecord }> =>
    apiRequest(apiClient.get<{ workflow: WorkflowRecord }>(`/account/workflows/${id}`)),

  create: (data: CreateWorkflowInput): Promise<{ workflow: WorkflowRecord }> =>
    apiRequest(apiClient.post<{ workflow: WorkflowRecord }>('/account/workflows', data)),

  update: (id: string, data: UpdateWorkflowInput): Promise<{ workflow: WorkflowRecord }> =>
    apiRequest(apiClient.put<{ workflow: WorkflowRecord }>(`/account/workflows/${id}`, data)),

  delete: (id: string): Promise<void> =>
    apiRequestVoid(apiClient.delete(`/account/workflows/${id}`)),

  publish: (id: string): Promise<void> =>
    apiRequestVoid(apiClient.post(`/account/workflows/${id}/publish`)),

  archive: (id: string): Promise<void> =>
    apiRequestVoid(apiClient.post(`/account/workflows/${id}/archive`)),
}
