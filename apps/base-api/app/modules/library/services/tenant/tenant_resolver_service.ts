import Tenant from '#modules/library/models/tenant'
import { tenantContext, toTenantContext } from '#modules/library/services/tenant/tenant_context'
import TenantNotFoundException from '#modules/library/exceptions/tenant_not_found_exception'

export interface TenantResolveInput {
  slug?: string | null
  tenantId?: string | null
}

export default class TenantResolverService {
  async resolve(input: TenantResolveInput): Promise<Tenant> {
    const slug = input.slug?.trim().toLowerCase()
    const tenantId = input.tenantId?.trim()

    let tenant: Tenant | null = null

    if (tenantId) {
      tenant = await Tenant.query().where('id', tenantId).first()
    } else if (slug) {
      tenant = await Tenant.query().where('slug', slug).first()
    }

    if (!tenant || tenant.status !== 'active') {
      throw new TenantNotFoundException()
    }

    return tenant
  }

  async resolveAndRun<T>(input: TenantResolveInput, callback: () => Promise<T>): Promise<T> {
    const tenant = await this.resolve(input)
    return tenantContext.run(toTenantContext(tenant), callback)
  }
}
