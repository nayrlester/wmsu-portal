import { useQuery } from '@tanstack/react-query'
import { fetchAnalyticsDashboard } from '@/lib/analytics-api'

export function useAnalyticsDashboard(days = 30, enabled = true) {
  return useQuery({
    queryKey: ['analytics', 'dashboard', days],
    queryFn: () => fetchAnalyticsDashboard(days),
    enabled,
  })
}
