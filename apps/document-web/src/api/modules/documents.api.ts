import { apiClient } from '@/api/client'
import { apiRequest, apiRequestVoid } from '@/api/utils/request'
import type { DocumentRecord, PaginatedResponse, TimelineEntry } from '@/shared/types'
import type { PaginatedMeta } from '@/types/api'
import type { DocumentSummary } from '@/types/tracking'
import type {
  ActivityRecord,
  DepartmentRecord,
  DocumentTypeRecord,
  DocumentWorkflowState,
  FileEditPayload,
  FileEditSheet,
  FileRecord,
  VersionRecord,
} from '@/features/documents/types/document.types'
import type { ApiListParams } from '@/api/types'

export const documentsApi = {
  list: (params?: ApiListParams): Promise<PaginatedResponse<DocumentRecord>> =>
    apiRequest(apiClient.get<PaginatedResponse<DocumentRecord>>('/account/documents', { params })),

  search: (q: string, params?: ApiListParams): Promise<PaginatedResponse<DocumentRecord>> =>
    apiRequest(
      apiClient.get<PaginatedResponse<DocumentRecord>>('/account/documents/search', {
        params: { q, ...params },
      })
    ),

  get: (id: string): Promise<DocumentSummary & DocumentRecord> =>
    apiRequest(apiClient.get<DocumentSummary & DocumentRecord>(`/account/documents/${id}`)),

  create: (data: Record<string, unknown>): Promise<DocumentRecord> =>
    apiRequest(apiClient.post<DocumentRecord>('/account/documents', data)),

  update: (id: string, data: Record<string, unknown>): Promise<DocumentRecord> =>
    apiRequest(apiClient.put<DocumentRecord>(`/account/documents/${id}`, data)),

  delete: (id: string): Promise<void> =>
    apiRequestVoid(apiClient.delete(`/account/documents/${id}`)),

  submit: (id: string): Promise<void> =>
    apiRequestVoid(apiClient.post(`/account/documents/${id}/submit`)),

  departments: (): Promise<{ departments: DepartmentRecord[] }> =>
    apiRequest(apiClient.get<{ departments: DepartmentRecord[] }>('/account/documents/departments')),

  documentTypes: (): Promise<{ documentTypes: DocumentTypeRecord[] }> =>
    apiRequest(
      apiClient.get<{ documentTypes: DocumentTypeRecord[] }>('/account/documents/document-types')
    ),

  timeline: (id: string): Promise<{ timeline: TimelineEntry[] }> =>
    apiRequest(apiClient.get<{ timeline: TimelineEntry[] }>(`/account/documents/${id}/timeline`)),

  workflow: (id: string): Promise<DocumentWorkflowState> =>
    apiRequest(apiClient.get<DocumentWorkflowState>(`/account/documents/${id}/workflow`)),

  activity: (id: string, limit = 50): Promise<{ activity: ActivityRecord[] }> =>
    apiRequest(
      apiClient.get<{ activity: ActivityRecord[] }>(`/account/documents/${id}/activity`, {
        params: { limit },
      })
    ),

  files: (documentId: string): Promise<{ files: FileRecord[] }> =>
    apiRequest(apiClient.get<{ files: FileRecord[] }>(`/account/documents/${documentId}/files`)),

  uploadFile: (documentId: string, versionId: string, file: File): Promise<unknown> => {
    const form = new FormData()
    form.append('file', file)
    return apiRequest(
      apiClient.post(`/account/documents/${documentId}/versions/${versionId}/files`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
    )
  },

  downloadFile: (documentId: string, fileId: string): Promise<{ url: string }> =>
    apiRequest(
      apiClient.get<{ url: string }>(`/account/documents/${documentId}/files/${fileId}/download`)
    ),

  viewFile: (documentId: string, fileId: string): Promise<{ url: string }> =>
    apiRequest(
      apiClient.get<{ url: string }>(`/account/documents/${documentId}/files/${fileId}/view`)
    ),

  previewHtml: (
    documentId: string,
    fileId: string
  ): Promise<{ html: string; originalName: string; mimeType: string }> =>
    apiRequest(
      apiClient.get<{ html: string; originalName: string; mimeType: string }>(
        `/account/documents/${documentId}/files/${fileId}/preview-html`
      )
    ),

  deleteFile: (documentId: string, fileId: string): Promise<void> =>
    apiRequestVoid(apiClient.delete(`/account/documents/${documentId}/files/${fileId}`)),

  replaceFile: (
    documentId: string,
    fileId: string,
    file: File,
    changeNotes?: string
  ): Promise<{ version: VersionRecord; file: FileRecord }> => {
    const form = new FormData()
    form.append('file', file)
    if (changeNotes) form.append('changeNotes', changeNotes)
    return apiRequest(
      apiClient.post<{ version: VersionRecord; file: FileRecord }>(
        `/account/documents/${documentId}/files/${fileId}/replace`,
        form,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      )
    )
  },

  getFileEdit: (documentId: string, fileId: string): Promise<FileEditPayload> =>
    apiRequest(apiClient.get<FileEditPayload>(`/account/documents/${documentId}/files/${fileId}/edit`)),

  saveFileEdit: (
    documentId: string,
    fileId: string,
    data: { content?: string; sheets?: FileEditSheet[]; changeNotes?: string }
  ): Promise<{ version: VersionRecord; file: FileRecord }> =>
    apiRequest(
      apiClient.put<{ version: VersionRecord; file: FileRecord }>(
        `/account/documents/${documentId}/files/${fileId}/edit`,
        data
      )
    ),

  versions: (
    documentId: string,
    page = 1,
    limit = 25
  ): Promise<{ versions: VersionRecord[]; meta: PaginatedMeta }> =>
    apiRequest(
      apiClient.get<{ versions: VersionRecord[]; meta: PaginatedMeta }>(
        `/account/documents/${documentId}/versions`,
        { params: { page, limit } }
      )
    ),

  createVersion: (documentId: string, data?: { changeNotes?: string }): Promise<VersionRecord> =>
    apiRequest(apiClient.post<VersionRecord>(`/account/documents/${documentId}/versions`, data ?? {})),

  submitVersion: (documentId: string, versionId: string): Promise<void> =>
    apiRequestVoid(
      apiClient.post(`/account/documents/${documentId}/versions/${versionId}/submit`)
    ),

  getContent: (documentId: string): Promise<{ contentHtml: string | null; sourceType: string }> =>
    apiRequest(
      apiClient.get<{ contentHtml: string | null; sourceType: string }>(
        `/account/documents/${documentId}/content`
      )
    ),

  saveContent: (
    documentId: string,
    data: { contentHtml: string; changeNotes?: string }
  ): Promise<{ document: DocumentRecord; version: VersionRecord }> =>
    apiRequest(
      apiClient.put<{ document: DocumentRecord; version: VersionRecord }>(
        `/account/documents/${documentId}/content`,
        data
      )
    ),

  logView: (documentId: string): Promise<void> =>
    apiRequest(apiClient.post(`/account/documents/${documentId}/views`)),
}
