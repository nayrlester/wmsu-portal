import { apiClient } from '@/api/client'
import { apiRequest, apiRequestVoid } from '@/api/utils/request'
import type { DocumentRecord, PaginatedResponse } from '@/shared/types'
import type { ApiListParams } from '@/api/types'

export interface FilePlanNode {
  id: string
  parentId: string | null
  name: string
  code: string | null
  path: string
  sortOrder: number
  isActive: boolean
}

export const udmsApi = {
  listRepository: (params?: ApiListParams): Promise<PaginatedResponse<DocumentRecord>> =>
    apiRequest(apiClient.get<PaginatedResponse<DocumentRecord>>('/udms/repository', { params })),

  register: (data: Record<string, unknown>): Promise<DocumentRecord> =>
    apiRequest(apiClient.post<DocumentRecord>('/udms/repository/register', data)),

  get: (id: string): Promise<DocumentRecord> =>
    apiRequest(apiClient.get<DocumentRecord>(`/udms/repository/${id}`)),

  updateMetadata: (id: string, data: Record<string, unknown>): Promise<DocumentRecord> =>
    apiRequest(apiClient.put<DocumentRecord>(`/udms/repository/${id}/metadata`, data)),

  listFilePlan: (params?: { parentId?: string; rootsOnly?: boolean }): Promise<FilePlanNode[]> =>
    apiRequest(apiClient.get<FilePlanNode[]>('/udms/file-plan', { params })),

  createFilePlan: (data: {
    name: string
    code?: string
    parentId?: string
    sortOrder?: number
  }): Promise<FilePlanNode> => apiRequest(apiClient.post<FilePlanNode>('/udms/file-plan', data)),

  updateFilePlan: (
    id: string,
    data: { name?: string; code?: string | null; sortOrder?: number; isActive?: boolean }
  ): Promise<FilePlanNode> =>
    apiRequest(apiClient.put<FilePlanNode>(`/udms/file-plan/${id}`, data)),

  deleteFilePlan: (id: string): Promise<void> =>
    apiRequestVoid(apiClient.delete(`/udms/file-plan/${id}`)),

  listAssignedQueue: (
    params?: ApiListParams & { status?: string; search?: string }
  ): Promise<PaginatedResponse<DocumentRecord>> =>
    apiRequest(
      apiClient.get<PaginatedResponse<DocumentRecord>>('/udms/workflow/queues/assigned', { params })
    ),

  listOfficeQueue: (
    params: ApiListParams & { officeId: string; status?: string; search?: string }
  ): Promise<PaginatedResponse<DocumentRecord>> =>
    apiRequest(
      apiClient.get<PaginatedResponse<DocumentRecord>>('/udms/workflow/queues/office', { params })
    ),

  listAwaitingActionQueue: (
    params?: ApiListParams & { status?: string; search?: string }
  ): Promise<PaginatedResponse<DocumentRecord>> =>
    apiRequest(
      apiClient.get<PaginatedResponse<DocumentRecord>>('/udms/workflow/queues/awaiting-action', {
        params,
      })
    ),

  getTracking: (id: string): Promise<UdmsTrackingPayload> =>
    apiRequest(apiClient.get<UdmsTrackingPayload>(`/udms/workflow/documents/${id}/tracking`)),

  assign: (
    id: string,
    data: { toUserId: string; toOfficeId?: string; remarks?: string }
  ): Promise<DocumentRecord> =>
    apiRequest(apiClient.post<DocumentRecord>(`/udms/workflow/documents/${id}/assign`, data)),

  route: (
    id: string,
    data: { toUserId?: string; toOfficeId?: string; remarks: string }
  ): Promise<DocumentRecord> =>
    apiRequest(apiClient.post<DocumentRecord>(`/udms/workflow/documents/${id}/route`, data)),

  act: (
    id: string,
    data: {
      action: 'approve' | 'reject' | 'return' | 'forward'
      comments?: string | null
      stepNodeId?: string | null
      toUserId?: string | null
      versionId?: string | null
    }
  ): Promise<{
    completed: boolean
    document: DocumentRecord
    workflowInstance: { id: string; status: string; currentNodeId: string | null; activeNodeIds: string[] } | null
  }> => apiRequest(apiClient.post(`/udms/workflow/documents/${id}/actions`, data)),

  listVersions: (
    id: string,
    params?: { page?: number; limit?: number }
  ): Promise<UdmsVersionsPayload> =>
    apiRequest(apiClient.get<UdmsVersionsPayload>(`/udms/lifecycle/documents/${id}/versions`, { params })),

  createVersion: (id: string, data?: { changeNotes?: string }): Promise<UdmsVersionRecord> =>
    apiRequest(apiClient.post<UdmsVersionRecord>(`/udms/lifecycle/documents/${id}/versions`, data ?? {})),

  getLifecycleSummary: (id: string): Promise<UdmsLifecycleSummary> =>
    apiRequest(apiClient.get<UdmsLifecycleSummary>(`/udms/lifecycle/documents/${id}/summary`)),

  listArchived: (params?: ApiListParams & { search?: string }): Promise<PaginatedResponse<DocumentRecord>> =>
    apiRequest(apiClient.get<PaginatedResponse<DocumentRecord>>('/udms/lifecycle/archived', { params })),

  archive: (id: string): Promise<DocumentRecord> =>
    apiRequest(apiClient.post<DocumentRecord>(`/udms/lifecycle/documents/${id}/archive`)),

  restore: (
    id: string,
    data: { remarks: string; targetLifecycleStatus?: string }
  ): Promise<DocumentRecord> =>
    apiRequest(apiClient.post<DocumentRecord>(`/udms/lifecycle/documents/${id}/restore`, data)),

  listRetentionSchedules: (): Promise<{ data: UdmsRetentionSchedule[]; policyNotes: Record<string, string> }> =>
    apiRequest(apiClient.get('/udms/lifecycle/retention/schedules')),

  applyRetention: (id: string, retentionScheduleId: string): Promise<DocumentRecord> =>
    apiRequest(
      apiClient.post<DocumentRecord>(`/udms/lifecycle/documents/${id}/retention`, {
        retentionScheduleId,
      })
    ),

  listRetentionDue: (
    params?: ApiListParams & { search?: string }
  ): Promise<PaginatedResponse<DocumentRecord> & { policyNotes?: Record<string, string> }> =>
    apiRequest(apiClient.get('/udms/lifecycle/retention/due', { params })),

  getReportsDashboard: (params?: UdmsReportFilterParams): Promise<UdmsReportsDashboard> =>
    apiRequest(apiClient.get<UdmsReportsDashboard>('/udms/reports/dashboard', { params })),

  getRegistrationReport: (params?: UdmsReportFilterParams): Promise<UdmsRegistrationReport> =>
    apiRequest(apiClient.get<UdmsRegistrationReport>('/udms/reports/registration', { params })),

  getWorkflowReport: (params?: UdmsReportFilterParams): Promise<UdmsWorkflowReport> =>
    apiRequest(apiClient.get<UdmsWorkflowReport>('/udms/reports/workflow', { params })),

  getArchivalReport: (params?: UdmsReportFilterParams): Promise<UdmsArchivalReport> =>
    apiRequest(apiClient.get<UdmsArchivalReport>('/udms/reports/archival', { params })),

  downloadReportCsv: async (
    kind: 'dashboard' | 'registration' | 'archival',
    params?: UdmsReportFilterParams
  ): Promise<void> => {
    const res = await apiClient.get(`/udms/reports/${kind}`, {
      params: { ...params, format: 'csv' },
      responseType: 'blob',
    })
    const blob = new Blob([res.data], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `udms-${kind}-${Date.now()}.csv`
    a.click()
    URL.revokeObjectURL(url)
  },

  openPrintableReport: async (params?: UdmsReportFilterParams): Promise<void> => {
    const res = await apiClient.get('/udms/reports/printable', {
      params,
      responseType: 'text',
    })
    const blob = new Blob([res.data], { type: 'text/html;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    window.open(url, '_blank', 'noopener,noreferrer')
  },
}

export type UdmsReportFilterParams = {
  from?: string
  to?: string
  officeId?: string
  documentTypeId?: string
  napCategory?: string
  status?: string
  lifecycleStatus?: string
  page?: number
  limit?: number
  format?: 'json' | 'csv'
}

export type UdmsReportsDashboard = {
  period: { from: string; to: string }
  generatedAt: string
  metrics: Record<string, number | null>
  distributions: {
    byStatus: Record<string, number>
    byNapCategory: Record<string, number>
    byDepartmentId: Record<string, number>
    receivedByReceivingOfficeId?: Record<string, number>
    byOriginatingOfficeId?: Record<string, number>
    volumeHandledByStaffId?: Record<string, number>
  }
  registrationTrend: Array<{ day: string; total: number }>
  recentActivity: Array<{
    id: string
    title: string
    trackingNumber: string
    status: string
    updatedAt: string
  }>
  metricDefinitions: Record<string, string>
  policyNotes: Record<string, string>
}

export type UdmsRegistrationReport = {
  period: { from: string; to: string }
  aggregates: Record<string, Record<string, number>>
  trend: Array<{ day: string; total: number }>
  data: DocumentRecord[]
  meta: unknown
  metricDefinitions: Record<string, string>
}

export type UdmsWorkflowReport = {
  period: { from: string; to: string }
  metrics: Record<string, number>
  distributions: {
    routingByAction: Record<string, number>
    approvalsByAction: Record<string, number>
  }
  recentRouting: unknown[]
  recentApprovals: unknown[]
  metricDefinitions: Record<string, string>
  policyNotes: Record<string, string>
}

export type UdmsArchivalReport = {
  period: { from: string; to: string }
  metrics: Record<string, number>
  distributions: { byLifecycleStatus: Record<string, number> }
  data: DocumentRecord[]
  meta: unknown
  metricDefinitions: Record<string, string>
  policyNotes: Record<string, string>
}

export interface UdmsVersionRecord {
  id: string
  versionNumber?: number
  versionMinor?: number
  label: string
  changeNotes?: string | null
  status: string
  submittedAt?: string | null
  createdAt: string
  createdBy?: { id: string; fullName: string | null } | null
  files?: unknown[]
}

export interface UdmsVersionsPayload {
  documentId: string
  currentVersion: { id: string; label: string; status: string; createdAt: string } | null
  versions: UdmsVersionRecord[]
  meta: unknown
  policyNotes: Record<string, string>
}

export interface UdmsRetentionSchedule {
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

export interface UdmsLifecycleSummary {
  document: DocumentRecord
  retention: {
    scheduleId: string | null
    schedule: UdmsRetentionSchedule | null
    dueAt: string | null
    dispositionAction: string | null
    legalHold: boolean
    legalHoldReason: string | null
  }
  lifecycle: {
    status: string
    documentStatus: string
    archivedAt: string | null
  }
  currentVersion: UdmsVersionRecord | null
  policyNotes: Record<string, string>
}

export interface UdmsTrackingPayload {
  document: DocumentRecord
  currentAssignment: {
    assignedToId: string | null
    assignedTo: { id: string; fullName: string | null; email: string } | null
    departmentId: string | null
    receivingOfficeId: string | null
    originatingOfficeId: string | null
    status: string
  }
  workflow: {
    active: boolean
    canCurrentUserAct: boolean
    instance: { id: string; status: string; currentNodeId: string | null } | null
  }
  timeline: unknown
  activity: unknown
  policyNotes: {
    escalationRules: string
    defaultWorkflowGraphs: string
  }
}
