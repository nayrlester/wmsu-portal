import { apiClient } from '@/lib/api-client'
import type { ApiResponse } from '@/types/auth'

export type ImportResult = {
  createdCount: number
  createdIds: string[]
  errors?: Array<{ line?: number; error: string }>
}

export async function importCatalogCsv(csv: string) {
  const { data } = await apiClient.post<ApiResponse<ImportResult>>('/catalog/import/csv', { csv })
  return data.data
}

export async function importCatalogMarc(records: Array<Record<string, unknown>>) {
  const { data } = await apiClient.post<ApiResponse<ImportResult>>('/catalog/import/marc', {
    records,
  })
  return data.data
}

export async function importCatalogXlsx(base64: string) {
  const { data } = await apiClient.post<ApiResponse<ImportResult>>('/catalog/import/xlsx', {
    base64,
  })
  return data.data
}

export async function fetchCatalogVersions(bookId: string) {
  const { data } = await apiClient.get<
    ApiResponse<
      Array<{
        id: string
        version: number
        snapshot: Record<string, unknown>
        changedBy: string | null
        createdAt: string | null
      }>
    >
  >(`/catalog/books/${bookId}/versions`)
  return data.data
}

export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = String(reader.result || '')
      const base64 = result.includes(',') ? result.split(',')[1]! : result
      resolve(base64)
    }
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsDataURL(file)
  })
}
