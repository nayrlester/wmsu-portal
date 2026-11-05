import { apiClient } from '@/lib/api-client'
import type { ApiResponse } from '@/types/auth'
import type { AnalyticsDashboard } from '@/types/analytics'

export async function fetchAnalyticsDashboard(days = 30) {
  const { data } = await apiClient.get<ApiResponse<AnalyticsDashboard>>('/analytics/dashboard', {
    params: { days },
  })
  return data.data
}
