import { apiClient } from '@/lib/api-client'
import type { ApiResponse } from '@/types/auth'

export interface UlmisSettingRow {
  id: string
  settingKey: string
  settingValue: Record<string, unknown>
  description: string | null
  updatedAt: string
}

export async function fetchUlmisSettings() {
  const { data } = await apiClient.get<ApiResponse<UlmisSettingRow[]>>('/ulmis/settings')
  return data.data
}

export async function upsertUlmisSetting(payload: {
  settingKey: string
  settingValue: Record<string, unknown>
  description?: string
}) {
  const { data } = await apiClient.put<ApiResponse<UlmisSettingRow>>('/ulmis/settings', payload)
  return data.data
}
