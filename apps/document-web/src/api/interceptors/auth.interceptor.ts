import type { AxiosInstance, InternalAxiosRequestConfig } from 'axios'
import { API_HEADERS } from '@/api/config'
import { tokenStorage } from '@/shared/lib/token-storage'

export function attachAuthInterceptor(client: AxiosInstance): void {
  client.interceptors.request.use((config: InternalAxiosRequestConfig) => {
    if (config.skipAuth) return config

    const token = tokenStorage.getAccessToken()
    if (token) {
      config.headers.set(API_HEADERS.authorization, `Bearer ${token}`)
    }

    return config
  })
}
