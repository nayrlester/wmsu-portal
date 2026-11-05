import { AsyncLocalStorage } from 'node:async_hooks'

export interface TenantContext {
  tenantId: string
  tenantSlug?: string
}

class TenantContextStore {
  #storage = new AsyncLocalStorage<TenantContext>()

  run<T>(context: TenantContext, callback: () => T): T {
    return this.#storage.run(context, callback)
  }

  get(): TenantContext | undefined {
    return this.#storage.getStore()
  }

  getTenantId(): string | undefined {
    return this.#storage.getStore()?.tenantId
  }

  requireTenantId(): string {
    const tenantId = this.getTenantId()
    if (!tenantId) {
      throw new Error('Tenant context is required but not set')
    }
    return tenantId
  }
}

export const tenantContext = new TenantContextStore()
