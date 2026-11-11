import axios from 'axios'
import { attachAxiosHttpNotifications } from '@wmsu/ui'
import { friendlyApiError } from '@/lib/user-messages'
import type { UserFacingAction } from '@wmsu/ui'
import { useAuthStore } from '@/stores/auth-store'
import { clearQueryCache } from '@/lib/query-client'

const PROD_BASE_API = 'https://wmsubase-api-production.up.railway.app'
const PROD_IDENTITY_URL = 'https://wmsu-api-production.up.railway.app'

function isProdWebHost(hostname: string): boolean {
  return hostname.endsWith('.vercel.app') || hostname.endsWith('arzaitsolutions.site')
}

function resolveApiBase(): string {
  const configured =
    (import.meta.env.VITE_API_URL as string | undefined)?.trim() || '/api/v1/enrollment'
  if (typeof window === 'undefined') return configured
  if (!configured.startsWith('/') || !isProdWebHost(window.location.hostname)) return configured
  return `${PROD_BASE_API}/api/v1/enrollment`
}

function resolveIdentityUrl(): string {
  const configured = (
    (import.meta.env.VITE_PLATFORM_IDENTITY_URL as string | undefined)?.trim() ||
    'http://127.0.0.1:3411'
  ).replace(/\/$/, '')
  if (typeof window === 'undefined') return configured
  if (!isProdWebHost(window.location.hostname)) return configured
  if (/localhost|127\.0\.0\.1/i.test(configured)) return PROD_IDENTITY_URL
  return configured
}

const API_BASE = resolveApiBase()
const IDENTITY_URL = resolveIdentityUrl()

export const apiClient = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
})

apiClient.interceptors.request.use((config) => {
  const { accessToken } = useAuthStore.getState()
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`
  } else if (!config.headers.Authorization && apiClient.defaults.headers.common.Authorization) {
    config.headers.Authorization = apiClient.defaults.headers.common.Authorization as string
  }
  return config
})

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true
      const { refreshToken, setTokens, logout, tokenKind } = useAuthStore.getState()
      if (refreshToken) {
        try {
          if (tokenKind === 'platform') {
            const { data } = await axios.post(`${IDENTITY_URL}/api/v1/auth/refresh`, {
              refreshToken,
            })
            const tokens = data.data?.tokens ?? data.data
            setTokens(tokens.accessToken, tokens.refreshToken, 'platform')
            original.headers.Authorization = `Bearer ${tokens.accessToken}`
            return apiClient(original)
          }

          const { data } = await axios.post(`${API_BASE}/auth/refresh`, { refreshToken })
          const tokens = data.data?.tokens ?? data.data
          setTokens(tokens.accessToken, tokens.refreshToken, 'local')
          original.headers.Authorization = `Bearer ${tokens.accessToken}`
          return apiClient(original)
        } catch {
          delete apiClient.defaults.headers.common.Authorization
          logout()
          clearQueryCache()
          const portal =
            (import.meta.env.VITE_PORTAL_URL as string | undefined)?.trim()?.replace(/\/$/, '') ||
            'http://127.0.0.1:5173'
          window.location.assign(`${portal}/login`)
        }
      }
    }
    return Promise.reject(error)
  }
)

attachAxiosHttpNotifications(apiClient)

export function getApiErrorMessage(
  err: unknown,
  _fallback = 'Something went wrong. Please try again.',
  action: UserFacingAction = 'generic'
): string {
  return friendlyApiError(err, action)
}
