import axios from 'axios'
import { attachAxiosHttpNotifications } from '@wmsu/ui'
import { apiConfig, API_HEADERS } from '@/api/config'
import { attachAuthInterceptor } from '@/api/interceptors/auth.interceptor'
import { attachTenantInterceptor } from '@/api/interceptors/tenant.interceptor'
import { attachRetryInterceptor } from '@/api/interceptors/retry.interceptor'
import { attachErrorInterceptor } from '@/api/interceptors/error.interceptor'

export const apiClient = axios.create({
  baseURL: apiConfig.baseURL,
  timeout: apiConfig.timeout,
  headers: { [API_HEADERS.contentType]: 'application/json' },
})

attachAuthInterceptor(apiClient)
attachTenantInterceptor(apiClient)
attachRetryInterceptor(apiClient)
attachErrorInterceptor(apiClient)
attachAxiosHttpNotifications(apiClient)

/** @deprecated Use apiClient — kept for incremental migration */
export const api = apiClient
