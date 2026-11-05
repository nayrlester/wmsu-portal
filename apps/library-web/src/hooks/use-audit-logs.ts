import { useQuery } from '@tanstack/react-query'
import { fetchAuditLogs } from '@/lib/audit-api'

export function useAuditLogs(page = 1, enabled = true) {
  return useQuery({
    queryKey: ['audit-logs', page],
    queryFn: () => fetchAuditLogs({ page }),
    enabled,
  })
}
