import { apiClient } from '@/lib/api-client'

export type DashboardSummary = {
  generatedAt: string
  filters: { from: string | null; to: string | null; locality: string | null }
  indicators: {
    transcriptRequestsTotal: number
    transcriptRequestsByStatus: Record<string, number>
    transcriptBacklog: number
    transcriptIssued: number
    transcriptReleased: number
    transcriptLocality: Record<string, number>
    transcriptClearance: Record<string, number>
    transcriptPayment: Record<string, number>
    transcriptAvgProcessingHours: number | null
    certificationRequestsTotal: number
    certificationRequestsByStatus: Record<string, number>
    certificationBacklog: number
    certificationIssued: number
    certificationReleased: number
    certificationLocality: Record<string, number>
    certificationClearance: Record<string, number>
    certificationPayment: Record<string, number>
    certificationAvgProcessingHours: number | null
    incompleteClearanceCount: number
    unpaidOrPendingPaymentCount: number
    alumniProfilesTotal: number
  }
  trends: {
    transcriptRequestsDaily: Array<{ date: string; count: number }>
    certificationRequestsDaily: Array<{ date: string; count: number }>
  }
  exclusions: Record<string, string>
  calculationNotes: Record<string, string>
}

export async function fetchTormsDashboardSummary(params?: {
  from?: string
  to?: string
  locality?: string
}) {
  const { data } = await apiClient.get('/torms/dashboard/summary', { params })
  return data.data as DashboardSummary
}
