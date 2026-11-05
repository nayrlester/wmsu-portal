import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios'
import { attachAxiosHttpNotifications, parseAxiosErrorMessage } from '@wmsu/ui'
import { useAuthStore } from '@/stores/auth-store'
import type { ApiResponse, AuthTokens } from '@/types/auth'
import { getDefaultTenantSlug, isUniversityMode } from '@/lib/deployment'

const API_URL = (import.meta.env.VITE_API_URL || '/api/v1/library').replace(/\/$/, '')

export const apiClient = axios.create({
  baseURL: /\/api\/v1(\/|$)/.test(API_URL) ? API_URL : `${API_URL}/api/v1/library`,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
})

apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const { tokens, tenant } = useAuthStore.getState()

  if (tokens?.accessToken) {
    config.headers.Authorization = `Bearer ${tokens.accessToken}`
  }

  const slug = tenant?.slug || (isUniversityMode() ? getDefaultTenantSlug() : null)
  if (slug) {
    config.headers['X-Tenant-Slug'] = slug
  }

  return config
})

let refreshPromise: Promise<AuthTokens> | null = null

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ApiResponse<unknown>>) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean }

    if (error.response?.status === 401 && !originalRequest._retry) {
      const { tokens, setTokens, logout } = useAuthStore.getState()

      if (!tokens?.refreshToken) {
        logout()
        const portal =
          (import.meta.env.VITE_PORTAL_URL as string | undefined)?.trim()?.replace(/\/$/, '') ||
          'http://127.0.0.1:5173'
        window.location.assign(`${portal}/login`)
        return Promise.reject(error)
      }

      originalRequest._retry = true

      try {
        refreshPromise ??= axios
          .post<ApiResponse<{ tokens: AuthTokens }>>(`${API_URL}/api/v1/auth/refresh`, {
            refreshToken: tokens.refreshToken,
          })
          .then((res) => {
            const newTokens = res.data.data.tokens
            setTokens(newTokens)
            return newTokens
          })
          .finally(() => {
            refreshPromise = null
          })

        const newTokens = await refreshPromise
        originalRequest.headers.Authorization = `Bearer ${newTokens.accessToken}`
        return apiClient(originalRequest)
      } catch {
        logout()
        const portal =
          (import.meta.env.VITE_PORTAL_URL as string | undefined)?.trim()?.replace(/\/$/, '') ||
          'http://127.0.0.1:5173'
        window.location.assign(`${portal}/login`)
        return Promise.reject(error)
      }
    }

    return Promise.reject(error)
  }
)

attachAxiosHttpNotifications(apiClient)

export function getApiErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    return parseAxiosErrorMessage(error, 'An unexpected error occurred')
  }
  if (error instanceof Error) {
    return error.message
  }
  return 'An unexpected error occurred'
}
