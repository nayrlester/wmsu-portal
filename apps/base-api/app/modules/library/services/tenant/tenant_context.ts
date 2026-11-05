import { AsyncLocalStorage } from 'node:async_hooks'
import type Tenant from '#modules/library/models/tenant'

export interface TenantContextData {
  id: string
  slug: string
  name: string
  type: Tenant['type']
  status: Tenant['status']
}

const storage = new AsyncLocalStorage<TenantContextData>()

export const tenantContext = {
  run<T>(tenant: TenantContextData, callback: () => T): T {
    return storage.run(tenant, callback)
  },

  get(): TenantContextData {
    const ctx = storage.getStore()
    if (!ctx) {
      throw new Error('Tenant context is not available')
    }
    return ctx
  },

  tryGet(): TenantContextData | undefined {
    return storage.getStore()
  },
}

export function toTenantContext(tenant: Tenant): TenantContextData {
  return {
    id: tenant.id,
    slug: tenant.slug,
    name: tenant.name,
    type: tenant.type,
    status: tenant.status,
  }
}
