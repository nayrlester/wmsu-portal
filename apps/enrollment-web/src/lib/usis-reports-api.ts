import { apiClient } from '@/lib/api-client'

export type ReportFilters = {
  academicYearId?: string
  semester?: number | ''
  campusId?: string
  collegeCode?: string
  programId?: string
  yearLevel?: number | ''
  dateFrom?: string
  dateTo?: string
}

export type ReportCatalog = {
  role: string
  dashboards: string[]
  reports: Array<{
    id: string
    title: string
    description: string
    torIds: string[]
    confidential: boolean
    supportsExport: Array<'csv' | 'xlsx' | 'pdf'>
    calculation: string
  }>
}

export type ReportPayload = {
  reportId: string
  title: string
  filters: ReportFilters
  generatedAt: string
  columns: string[]
  rows: Record<string, unknown>[]
  totals: Record<string, number>
  validation: { ok: boolean; message: string; expectedTotal?: number; actualTotal?: number }
  confidential: boolean
  calculation: string
}

export type DashboardPayload = {
  role: string
  filters: ReportFilters
  cards: Array<{
    reportId: string
    title: string
    totals: Record<string, number>
    validationOk: boolean
    confidential: boolean
  }>
  availableReports: string[]
}

function cleanParams(filters: ReportFilters) {
  const params: Record<string, string | number> = {}
  if (filters.academicYearId) params.academicYearId = filters.academicYearId
  if (filters.semester !== '' && filters.semester != null) params.semester = Number(filters.semester)
  if (filters.campusId) params.campusId = filters.campusId
  if (filters.collegeCode) params.collegeCode = filters.collegeCode
  if (filters.programId) params.programId = filters.programId
  if (filters.yearLevel !== '' && filters.yearLevel != null) params.yearLevel = Number(filters.yearLevel)
  if (filters.dateFrom) params.dateFrom = filters.dateFrom
  if (filters.dateTo) params.dateTo = filters.dateTo
  return params
}

export async function fetchReportCatalog() {
  const { data } = await apiClient.get('/reports/catalog')
  return (data.data ?? data) as ReportCatalog
}

export async function fetchReportsDashboard(filters: ReportFilters = {}) {
  const { data } = await apiClient.get('/reports/dashboard', { params: cleanParams(filters) })
  return (data.data ?? data) as DashboardPayload
}

export async function fetchReport(reportId: string, filters: ReportFilters = {}) {
  const { data } = await apiClient.get(`/reports/${reportId}`, { params: cleanParams(filters) })
  return (data.data ?? data) as ReportPayload
}

export async function exportReport(
  reportId: string,
  format: 'csv' | 'xlsx' | 'pdf' | 'json',
  filters: ReportFilters = {}
) {
  const { data } = await apiClient.get(`/reports/${reportId}/export`, {
    params: { ...cleanParams(filters), format },
    responseType: 'blob',
  })
  return data as Blob
}

export async function fetchHemisSchema() {
  const { data } = await apiClient.get('/regulatory/hemis/schema')
  return (data.data ?? data) as {
    schemaVersion: string
    note: string
    datasets: Array<{ id: string; columns: string[] }>
  }
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
