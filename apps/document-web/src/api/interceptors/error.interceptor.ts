import type { AxiosError, AxiosInstance } from 'axios'
import { normalizeAxiosError } from '@/api/errors/api-error'
import { enqueueRefresh, isAuthRoute } from '@/api/lib/refresh-token-manager'
import { setAuthorizationHeader } from '@/api/interceptors/retry.interceptor'

export function attachErrorInterceptor(client: AxiosInstance): void {
  client.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
      const original = error.config

      if (
        error.response?.status === 401 &&
        original &&
        !original._retry &&
        !original.skipAuth &&
        !isAuthRoute(original.url)
      ) {
        original._retry = true

        try {
          const accessToken = await enqueueRefresh()
          setAuthorizationHeader(original, accessToken)
          return client(original)
        } catch (refreshError) {
          return Promise.reject(normalizeAxiosError(refreshError))
        }
      }

      return Promise.reject(normalizeAxiosError(error))
    }
  )
}
