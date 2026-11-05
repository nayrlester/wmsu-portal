import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import TenantResolverService from '#modules/library/services/tenant/tenant_resolver_service'
import { tenantContext, toTenantContext } from '#modules/library/services/tenant/tenant_context'
import TenantNotFoundException from '#modules/library/exceptions/tenant_not_found_exception'
import { resolveTenantSlug } from '#modules/library/services/deployment/deployment_mode'

export default class TenantResolverMiddleware {
  private resolver = new TenantResolverService()

  async handle(ctx: HttpContext, next: NextFn) {
    const explicitSlug =
      ctx.request.header('x-tenant-slug') ??
      ctx.request.input('tenantSlug') ??
      ctx.request.input('tenant_slug')

    const slug = resolveTenantSlug(explicitSlug)
    const tenantId = ctx.request.header('x-tenant-id')

    if (!slug && !tenantId) {
      throw new TenantNotFoundException('Tenant slug or id is required')
    }

    const tenant = await this.resolver.resolve({
      slug: slug ?? undefined,
      tenantId,
    })

    ctx.tenant = toTenantContext(tenant)

    await tenantContext.run(toTenantContext(tenant), async () => {
      await next()
    })
  }
}

declare module '@adonisjs/core/http' {
  interface HttpContext {
    tenant?: import('#modules/library/services/tenant/tenant_context').TenantContextData
  }
}
