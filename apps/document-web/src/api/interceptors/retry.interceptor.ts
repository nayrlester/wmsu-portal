import type { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios'
import { apiConfig } from '@/api/config'
import { API_HEADERS } from '@/api/config'

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function isRetryableRequest(config: InternalAxiosRequestConfig): boolean {
  const method = (config.method ?? 'get').toLowerCase()
  if (!apiConfig.retry.methods.includes(method as (typeof apiConfig.retry.methods)[number])) {
    return false
  }
  if (config._retryCount && config._retryCount >= apiConfig.retry.count) {
    return false
  }
  return true
}

function isRetryableError(error: AxiosError): boolean {
  if (!error.response) return true
  return apiConfig.retry.statusCodes.includes(
    error.response.status as (typeof apiConfig.retry.statusCodes)[number]
  )
}

export function attachRetryInterceptor(client: AxiosInstance): void {
  client.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
      const config = error.config
      if (!config || !isRetryableRequest(config) || !isRetryableError(error)) {
        return Promise.reject(error)
      }

      config._retryCount = (config._retryCount ?? 0) + 1
      await sleep(apiConfig.retry.delayMs * config._retryCount)

      return client(config)
    }
  )
}

export function setAuthorizationHeader(
  config: InternalAxiosRequestConfig,
  accessToken: string
): InternalAxiosRequestConfig {
  config.headers.set(API_HEADERS.authorization, `Bearer ${accessToken}`)
  return config
}
