import axios from 'axios'
import { attachAxiosHttpNotifications, parseAxiosErrorMessage } from '@wmsu/ui'
import { useAuthStore } from '@/stores/auth-store'
import { clearQueryCache } from '@/lib/query-client'

const PROD_API_URL = 'https://wmsubase-api-production.up.railway.app/api/v1/inventory'
const PROD_IDENTITY_URL = 'https://wmsu-api-production.up.railway.app'

function isProdWebHost(hostname: string): boolean {
  return (
    hostname === 'uims-inventory-pro.vercel.app' ||
    hostname.endsWith('.vercel.app') ||
    hostname.endsWith('arzaitsolutions.site')
  )
}

/** Absolute API base. Relative `/api/v1` only works with Vite proxy or Vercel rewrite. */
function resolveApiBase(): string {
  const configured = (import.meta.env.VITE_API_URL as string | undefined)?.trim() || '/api/v1/inventory'
  if (typeof window === 'undefined') return configured
  if (!configured.startsWith('/') || !isProdWebHost(window.location.hostname)) return configured
  // Misconfigured Vercel build baked relative URL — talk to Railway API directly.
  return PROD_API_URL
}

function resolveIdentityUrl(): string {
  const configured = (
    (import.meta.env.VITE_PLATFORM_IDENTITY_URL as string | undefined) ||
    'http://127.0.0.1:3411'
  ).replace(/\/$/, '')
  if (typeof window === 'undefined') return configured
  if (!isProdWebHost(window.location.hostname)) return configured
  if (
    /localhost|127\.0\.0\.1/i.test(configured) ||
    /inventory-pro-api/i.test(configured)
  ) {
    // Local default or swapped UIMS API host — Identity refresh must hit Identity.
    return PROD_IDENTITY_URL
  }
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
  fallback = 'Something went wrong. Please try again.'
): string {
  if (axios.isAxiosError(err)) {
    return parseAxiosErrorMessage(err, fallback)
  }
  if (err instanceof Error && err.message) {
    if (/network error|failed to fetch|econnrefused/i.test(err.message)) {
      return 'Cannot reach UIMS API. Confirm Base API is running on port 3500, then try again.'
    }
    return err.message
  }
  return fallback
}
