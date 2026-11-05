import { scope } from '@adonisjs/lucid/orm'
import { tenantContext } from '#modules/documents/domain/tenant_context'

/**
 * Restricts queries to the current async-local tenant context.
 * Pass an explicit tenantId to override (super-admin impersonation).
 */
export const forTenant = scope((query, tenantId?: string) => {
  const resolvedTenantId = tenantId ?? tenantContext.getTenantId()
  if (!resolvedTenantId) {
    throw new Error('Tenant context is required for scoped queries')
  }
  query.where('tenant_id', resolvedTenantId)
})

export const notSoftDeleted = scope((query) => {
  query.whereNull('deleted_at')
})
