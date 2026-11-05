import type { HttpContext } from '@adonisjs/core/http'
import { tenantContext } from '#modules/documents/domain/tenant_context'
import { TenantContextMissingException } from '#modules/documents/domain/exceptions/tenant_exceptions'

/** Resolve tenant ID from middleware context, ALS, auth user, or header */
export function resolveTenantId(ctx: HttpContext): string | undefined {
  return (
    ctx.tenant?.id ??
    tenantContext.getTenantId() ??
    ctx.auth.user?.tenantId ??
    ctx.request.header('x-tenant-id') ??
    undefined
  )
}

export function requireTenantId(ctx: HttpContext): string {
  const tenantId = resolveTenantId(ctx)
  if (!tenantId) {
    throw new TenantContextMissingException()
  }
  return tenantId
}
