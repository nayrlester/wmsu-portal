import { apiClient } from '@/api/client'
import { apiRequest, apiRequestVoid } from '@/api/utils/request'
import type { DocumentRecord, PaginatedResponse } from '@/shared/types'
import type { ApiListParams } from '@/api/types'

export interface ApprovalRecord {
  id: string
  action: string
  comments?: string | null
  approverId?: string
  stepNodeId?: string
  actedAt?: string
  createdAt?: string
}

export interface ApprovalActionInput {
  action: string
  comments?: string
  stepNodeId?: string
  versionId?: string
}

export const approvalsApi = {
  /** Documents awaiting approval for the current user/tenant */
  listPending: (params?: ApiListParams): Promise<PaginatedResponse<DocumentRecord>> =>
    apiRequest(
      apiClient.get<PaginatedResponse<DocumentRecord>>('/account/documents', {
        params: { status: 'pending_approval', limit: 50, ...params },
      })
    ),

  forDocument: (documentId: string): Promise<{ approvals: ApprovalRecord[] }> =>
    apiRequest(
      apiClient.get<{ approvals: ApprovalRecord[] }>(`/account/documents/${documentId}/approvals`)
    ),

  act: (documentId: string, data: ApprovalActionInput): Promise<void> =>
    apiRequestVoid(apiClient.post(`/account/documents/${documentId}/approvals`, data)),

  bulkAct: (data: {
    documentIds: string[]
    action: 'approve' | 'reject' | 'return'
    comments?: string
  }): Promise<{ processed: number; succeeded: number; failed: number }> =>
    apiRequest(
      apiClient.post<{ processed: number; succeeded: number; failed: number }>(
        '/account/approvals/bulk',
        data
      )
    ),
}
