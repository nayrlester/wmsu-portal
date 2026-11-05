type TenantIdResolver = () => string | null | undefined

let resolver: TenantIdResolver = () => null
let impersonatedTenantId: string | null = null

export const tenantContext = {
  /** Register resolver — called from app bootstrap (auth + org store) */
  registerResolver(fn: TenantIdResolver): void {
    resolver = fn
  },

  /** Super-admin tenant impersonation (sets X-Tenant-Id override) */
  setImpersonatedTenantId(tenantId: string | null): void {
    impersonatedTenantId = tenantId
  },

  getImpersonatedTenantId(): string | null {
    return impersonatedTenantId
  },

  /** Resolved tenant ID sent as X-Tenant-Id on every authenticated request */
  getActiveTenantId(): string | null {
    if (impersonatedTenantId) return impersonatedTenantId
    return resolver() ?? null
  },
}
