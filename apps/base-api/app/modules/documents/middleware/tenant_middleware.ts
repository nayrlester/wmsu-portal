import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import Tenant from '#modules/documents/models/tenant'
import TenantDomain from '#modules/documents/models/tenant_domain'
import { tenantContext } from '#modules/documents/domain/tenant_context'
import { cacheService } from '#infrastructure/cache/redis_cache_service'
import env from '#start/env'

const TENANT_CACHE_TTL = () => env.get('CACHE_TTL_TENANT_SECONDS') ?? 300

type CachedTenant = {
  id: string
  slug: string
  status: string
  name: string
}

function hydrateTenant(row: CachedTenant): Tenant {
  const tenant = new Tenant()
  tenant.merge(row)
  tenant.$isPersisted = true
  return tenant
}

export default class TenantMiddleware {
  async handle(ctx: HttpContext, next: NextFn) {
    const user = ctx.auth.user ?? ctx.platformUser
    let tenantId: string | undefined

    if (user?.tenantId) {
      tenantId = user.tenantId
    }

    const headerTenantId = ctx.request.header('x-tenant-id')
    if (headerTenantId) {
      if (user?.isSuperAdmin) {
        tenantId = headerTenantId
      } else if (!tenantId) {
        tenantId = headerTenantId
      } else if (tenantId !== headerTenantId) {
        return ctx.response.forbidden({
          error: 'X-Tenant-Id does not match your organization',
        })
      }
    }

    const host = ctx.request.hostname()
    if (!tenantId && host) {
      const domainCacheKey = `cache:domain:${host}`
      const cachedDomainTenantId = await cacheService.get<string>(domainCacheKey)

      if (cachedDomainTenantId) {
        tenantId = cachedDomainTenantId
      } else {
        const domain = await TenantDomain.query()
          .where('domain', host)
          .where('is_verified', true)
          .first()
        if (domain) {
          tenantId = domain.tenantId
          await cacheService.set(domainCacheKey, domain.tenantId, TENANT_CACHE_TTL())
        }
      }
    }

    if (!tenantId) {
      return ctx.response.forbidden({
        error: 'Tenant context could not be resolved',
      })
    }

    const cacheKey = `cache:tenant:${tenantId}`
    const cached = await cacheService.get<CachedTenant | null>(cacheKey)

    let tenant: Tenant | null = cached ? hydrateTenant(cached) : null

    if (!tenant) {
      const record = await Tenant.find(tenantId)
      if (!record || record.status === 'suspended') {
        return ctx.response.forbidden({
          error: 'Tenant is not active',
        })
      }

      tenant = record
      await cacheService.set(
        cacheKey,
        { id: record.id, slug: record.slug, status: record.status, name: record.name },
        TENANT_CACHE_TTL()
      )
    }

    if (tenant.status === 'suspended') {
      return ctx.response.forbidden({
        error: 'Tenant is not active',
      })
    }

    ctx.tenant = tenant

    await tenantContext.run({ tenantId, tenantSlug: tenant.slug }, async () => {
      await next()
    })
  }
}

declare module '@adonisjs/core/http' {
  interface HttpContext {
    tenant?: Tenant
  }
}
