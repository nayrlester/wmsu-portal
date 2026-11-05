import { apiClient } from '@/api/client'
import { apiRequest, apiRequestVoid } from '@/api/utils/request'

export type EsignRecipient = {
  email: string
  firstName?: string
  lastName?: string
  role?: string
}

export type EsignEnvelope = {
  id: string
  documentId: string
  versionId: string | null
  fileId: string | null
  pandadocDocumentId: string
  status: string
  recipients: EsignRecipient[]
  signedFileId: string | null
  signedFile?: {
    id: string
    originalName: string
    mimeType: string
    fileSize: number
  } | null
  errorMessage: string | null
  sentAt: string | null
  completedAt: string | null
  createdAt: string
}

export type RetentionSchedule = {
  id: string
  name: string
  code: string
  napCategory: string
  retentionYears: number
  retentionMonths: number
  dispositionAction: string
  description: string | null
  isActive: boolean
  isSystem: boolean
}

export type RecordsSummary = {
  dueForArchival: number
  approachingRetention: number
  byLifecycle: Record<string, number>
  byNapCategory: Record<string, number>
}

export const esignApi = {
  get: (documentId: string): Promise<{ envelope: EsignEnvelope | null }> =>
    apiRequest(apiClient.get(`/account/documents/${documentId}/esign`)),

  /** Create draft + return editor E-Token for place-fields (Embedded Sending). */
  start: (
    documentId: string,
    data?: { fileId?: string }
  ): Promise<{
    envelope: EsignEnvelope
    editorToken: string
    sessionId: string | null
    expiresAt: string | null
  }> =>
    apiRequest(
      apiClient.post(`/account/documents/${documentId}/esign/start`, data ?? {}, {
        timeout: 120_000,
      })
    ),

  /** Re-open place-fields editor for an unsent envelope. */
  placeSession: (
    documentId: string
  ): Promise<{ envelope: EsignEnvelope; editorToken: string; expiresAt: string | null }> =>
    apiRequest(
      apiClient.post(`/account/documents/${documentId}/esign/place-session`, {}, {
        timeout: 60_000,
      })
    ),

  /** After fields placed: silent-send + signing session. */
  finalize: (
    documentId: string
  ): Promise<{ envelope: EsignEnvelope; sessionId: string | null; expiresAt: string | null }> =>
    apiRequest(
      apiClient.post(`/account/documents/${documentId}/esign/finalize`, {}, {
        timeout: 120_000,
      })
    ),

  send: (
    documentId: string,
    data: {
      fileId?: string
      recipients?: EsignRecipient[]
      silent?: boolean
      openSession?: boolean
      subject?: string
      message?: string
    }
  ): Promise<{ envelope: EsignEnvelope; sessionId?: string | null; expiresAt?: string | null }> =>
    apiRequest(
      apiClient.post(`/account/documents/${documentId}/esign`, data, { timeout: 120_000 })
    ),

  session: (
    documentId: string
  ): Promise<{ envelope: EsignEnvelope; sessionId: string; expiresAt: string | null }> =>
    apiRequest(
      apiClient.post(`/account/documents/${documentId}/esign/session`, {}, { timeout: 60_000 })
    ),

  sync: (
    documentId: string
  ): Promise<{ envelope: EsignEnvelope; synced: boolean }> =>
    apiRequest(
      apiClient.post(`/account/documents/${documentId}/esign/sync`, {}, { timeout: 90_000 })
    ),
}

export const recordsApi = {
  listSchedules: (): Promise<{ schedules: RetentionSchedule[] }> =>
    apiRequest(apiClient.get('/account/retention-schedules')),

  createSchedule: (data: Partial<RetentionSchedule>): Promise<{ schedule: RetentionSchedule }> =>
    apiRequest(apiClient.post('/account/retention-schedules', data)),

  updateSchedule: (
    id: string,
    data: Partial<RetentionSchedule>
  ): Promise<{ schedule: RetentionSchedule }> =>
    apiRequest(apiClient.put(`/account/retention-schedules/${id}`, data)),

  deleteSchedule: (id: string): Promise<void> =>
    apiRequestVoid(apiClient.delete(`/account/retention-schedules/${id}`)),

  applyAgencyPacks: (
    packs: Array<'coa' | 'ched'> = ['coa', 'ched']
  ): Promise<{ upserted: number; packs: string[]; schedules: RetentionSchedule[] }> =>
    apiRequest(
      apiClient.post('/account/retention-schedules/agency-packs', { packs })
    ),

  summary: (): Promise<RecordsSummary> =>
    apiRequest(apiClient.get('/account/records/summary')),

  inventory: (params?: Record<string, string | number | boolean | undefined>) =>
    apiRequest(apiClient.get('/account/records/inventory', { params })),

  inventoryCsvUrl: (params?: Record<string, string | number | boolean | undefined>) => {
    const search = new URLSearchParams()
    search.set('format', 'csv')
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        if (value !== undefined && value !== '') search.set(key, String(value))
      }
    }
    return `/account/records/inventory?${search.toString()}`
  },

  updateLifecycle: (documentId: string, lifecycleStatus: string) =>
    apiRequest(apiClient.post(`/account/documents/${documentId}/lifecycle`, { lifecycleStatus })),
}
