import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios'
import { attachAxiosHttpNotifications, parseAxiosErrorMessage } from '@wmsu/ui'
import { useAuthStore } from '@/stores/auth-store'
import type { ApiResponse } from '@/types/auth'

const RAW_API_URL = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') || ''
const API_BASE = !RAW_API_URL
  ? '/api/v1'
  : /\/api\/v1(\/|$)/.test(RAW_API_URL)
    ? RAW_API_URL.replace(/\/api\/v1.*/, '/api/v1')
    : `${RAW_API_URL}/api/v1`

export const apiClient = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
})

apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const { accessToken } = useAuthStore.getState()
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`
  }
  return config
})

let refreshPromise: Promise<{ accessToken: string; refreshToken: string }> | null = null

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ApiResponse<unknown>>) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean }

    if (error.response?.status === 401 && !originalRequest._retry) {
      const { refreshToken, setTokens, logout } = useAuthStore.getState()

      if (!refreshToken) {
        logout()
        return Promise.reject(error)
      }

      originalRequest._retry = true

      try {
        const refreshUrl = `${API_BASE}/auth/refresh`
        refreshPromise ??= axios
          .post<ApiResponse<{ tokens: { accessToken: string; refreshToken: string } }>>(refreshUrl, {
            refreshToken,
          })
          .then((res) => {
            const tokens = res.data.data.tokens
            setTokens(tokens.accessToken, tokens.refreshToken)
            return tokens
          })
          .finally(() => {
            refreshPromise = null
          })

        const tokens = await refreshPromise
        originalRequest.headers.Authorization = `Bearer ${tokens.accessToken}`
        return apiClient(originalRequest)
      } catch {
        logout()
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
