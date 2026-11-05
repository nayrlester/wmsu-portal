import { apiClient } from '@/lib/api-client'
import type { ApiResponse } from '@/types/auth'

export interface ReportTypeInfo {
  type: string
  label: string
  tor: string[]
  description: string
}

export async function fetchReportTypes() {
  const { data } = await apiClient.get<ApiResponse<ReportTypeInfo[]>>('/reports')
  return data.data
}

export async function fetchReport(
  type: string,
  params: { from?: string; to?: string; status?: string; page?: number; perPage?: number } = {}
) {
  const { data } = await apiClient.get<
    ApiResponse<{
      type: string
      label?: string
      tor?: string[]
      description?: string
      generatedAt: string
      rowCount: number
      rows: Record<string, unknown>[]
    }> & {
      meta?: { total: number; page: number; perPage: number; lastPage: number }
    }
  >(`/reports/${type}`, { params: { ...params, format: 'json' } })
  return { ...data.data, meta: data.meta }
}

export async function downloadReport(
  type: string,
  format: 'csv' | 'pdf' | 'xlsx',
  params: { from?: string; to?: string; status?: string } = {}
) {
  const response = await apiClient.get(`/reports/${type}`, {
    params: { ...params, format },
    responseType: 'blob',
  })
  const mime =
    format === 'pdf'
      ? 'application/pdf'
      : format === 'xlsx'
        ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        : 'text/csv'
  const blob = new Blob([response.data], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${type}-report.${format === 'xlsx' ? 'xlsx' : format}`
  a.click()
  URL.revokeObjectURL(url)
}
