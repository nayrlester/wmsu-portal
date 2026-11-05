import type { AxiosInstance, InternalAxiosRequestConfig } from 'axios'
import { API_HEADERS } from '@/api/config'
import { tenantContext } from '@/api/lib/tenant-context'

export function attachTenantInterceptor(client: AxiosInstance): void {
  client.interceptors.request.use((config: InternalAxiosRequestConfig) => {
    if (config.skipTenant) return config

    const tenantId = tenantContext.getActiveTenantId()
    if (tenantId) {
      config.headers.set(API_HEADERS.tenantId, tenantId)
    }

    return config
  })
}
