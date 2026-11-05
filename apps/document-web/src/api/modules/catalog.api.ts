import { apiClient } from '@/api/client'
import { apiRequest } from '@/api/utils/request'
import type { CatalogDepartmentRecord, CatalogDocumentTypeRecord } from '@/features/documents/types/document.types'

export interface CreateDepartmentInput {
  name: string
  code?: string
  description?: string
  isActive?: boolean
}

export interface UpdateDepartmentInput {
  name?: string
  code?: string | null
  description?: string | null
  isActive?: boolean
}

export interface CreateDocumentTypeInput {
  name: string
  code: string
  description?: string
  isActive?: boolean
}

export interface UpdateDocumentTypeInput {
  name?: string
  code?: string
  description?: string | null
  isActive?: boolean
}

export const catalogApi = {
  departments: {
    list: (): Promise<{ departments: CatalogDepartmentRecord[] }> =>
      apiRequest(apiClient.get<{ departments: CatalogDepartmentRecord[] }>('/account/departments')),

    create: (data: CreateDepartmentInput): Promise<{ department: CatalogDepartmentRecord }> =>
      apiRequest(apiClient.post<{ department: CatalogDepartmentRecord }>('/account/departments', data)),

    update: (id: string, data: UpdateDepartmentInput): Promise<{ department: CatalogDepartmentRecord }> =>
      apiRequest(apiClient.put<{ department: CatalogDepartmentRecord }>(`/account/departments/${id}`, data)),

    deactivate: (id: string): Promise<{ message: string }> =>
      apiRequest(apiClient.delete<{ message: string }>(`/account/departments/${id}`)),
  },

  documentTypes: {
    list: (): Promise<{ documentTypes: CatalogDocumentTypeRecord[] }> =>
      apiRequest(
        apiClient.get<{ documentTypes: CatalogDocumentTypeRecord[] }>('/account/document-types')
      ),

    create: (data: CreateDocumentTypeInput): Promise<{ documentType: CatalogDocumentTypeRecord }> =>
      apiRequest(
        apiClient.post<{ documentType: CatalogDocumentTypeRecord }>('/account/document-types', data)
      ),

    update: (
      id: string,
      data: UpdateDocumentTypeInput
    ): Promise<{ documentType: CatalogDocumentTypeRecord }> =>
      apiRequest(
        apiClient.put<{ documentType: CatalogDocumentTypeRecord }>(
          `/account/document-types/${id}`,
          data
        )
      ),

    deactivate: (id: string): Promise<{ message: string }> =>
      apiRequest(apiClient.delete<{ message: string }>(`/account/document-types/${id}`)),
  },
}
