import { apiClient } from '@/api/client'
import { apiRequest } from '@/api/utils/request'
import { env } from '@/shared/constants/env'
import type { PublicTrackView } from '@/types/tracking'

function normalizeTrackingNumber(trackingNumber: string): string {
  return trackingNumber.trim().toUpperCase()
}

/**
 * In local/dev, always hit same-origin `/api/v1/documents` so phone QR scans
 * (LAN IP → Vite) proxy to Base API. Absolute 127.0.0.1 fails on phones.
 */
function trackRequestConfig() {
  const config = { skipAuth: true as const, skipTenant: true as const }
  if (env.isDev || !env.apiUrl) {
    return { ...config, baseURL: '/api/v1/documents' }
  }
  return config
}

export const trackApi = {
  get: (trackingNumber: string) =>
    apiRequest(
      apiClient.get<PublicTrackView>(
        `/public/track/${encodeURIComponent(normalizeTrackingNumber(trackingNumber))}`,
        trackRequestConfig()
      )
    ),
}
