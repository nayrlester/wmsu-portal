import { apiClient } from '@/api/client'
import { apiRequest } from '@/api/utils/request'

export type PlatformDocumentPrefix = 'hris' | 'library' | 'doctrack'

export interface PlatformDocumentDto {
  id: string
  orgId: string
  platformPrefix: PlatformDocumentPrefix
  platformLabel: string
  storageKey: string
  originalName: string
  contentType: string
  sizeBytes: number
  uploadedBy: string
  entityType: string | null
  entityId: string | null
  status: 'active' | 'deleted'
  createdAt: string
  updatedAt: string
}

export interface PlatformDocumentListResult {
  items: PlatformDocumentDto[]
  total: number
  limit: number
  offset: number
}

export const platformDocumentsApi = {
  list: (params?: {
    platformPrefix?: PlatformDocumentPrefix
    limit?: number
    offset?: number
  }): Promise<PlatformDocumentListResult> =>
    apiRequest(
      apiClient.get<PlatformDocumentListResult>('/account/platform-documents', { params })
    ),

  downloadMeta: (
    id: string
  ): Promise<{ url?: string; expiresIn?: number; document?: PlatformDocumentDto }> =>
    apiRequest(
      apiClient.get(`/account/platform-documents/${id}/download`, {
        headers: { Accept: 'application/json' },
      })
    ),
}
