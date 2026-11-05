import { apiClient } from '@/lib/api-client'
import type { ReportType } from '../types'

export async function downloadReport(type: ReportType, format: 'csv' = 'csv'): Promise<Blob> {
  const { data } = await apiClient.get(`/reports/${type}`, {
    params: { format },
    responseType: 'blob',
  })
  return data
}

export function triggerBlobDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
