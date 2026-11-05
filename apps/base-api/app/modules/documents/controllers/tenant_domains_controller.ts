import type { HttpContext } from '@adonisjs/core/http'
import { addTenantDomainValidator, verifyTenantDomainValidator } from '#modules/documents/validators/tenant'
import { tenantDomainService } from '#modules/documents/services/tenant_domain_service'
import { tenantContext } from '#modules/documents/domain/tenant_context'
import { TenantPolicy } from '#modules/documents/domain/policies/tenant_policy'

export default class TenantDomainsController {
  async index({ auth, response }: HttpContext) {
    const user = auth.user!
    const tenantId = tenantContext.requireTenantId()
    await TenantPolicy.assertTenantSettings(user, tenantId)

    const domains = await tenantDomainService.list()
    return response.ok({ domains: domains.map((d) => tenantDomainService.serialize(d)) })
  }

  async store({ auth, request, response }: HttpContext) {
    const user = auth.user!
    const tenantId = tenantContext.requireTenantId()
    await TenantPolicy.assertTenantSettings(user, tenantId)

    const { domain } = await request.validateUsing(addTenantDomainValidator)
    const result = await tenantDomainService.add(domain, user.id)

    return response.created({
      domain: tenantDomainService.serialize(result.domain),
      verificationToken: result.verificationToken,
      dnsInstructions: {
        type: 'TXT',
        host: `_cdts-verify.${domain}`,
        value: result.verificationToken,
      },
    })
  }

  async verify({ auth, request, response }: HttpContext) {
    const user = auth.user!
    const tenantId = tenantContext.requireTenantId()
    await TenantPolicy.assertTenantSettings(user, tenantId)

    const { token } = await request.validateUsing(verifyTenantDomainValidator)
    const domain = await tenantDomainService.verify(token, user.id)

    return response.ok({
      message: 'Domain verified successfully',
      domain: tenantDomainService.serialize(domain),
    })
  }

  async setPrimary({ auth, params, response }: HttpContext) {
    const user = auth.user!
    const tenantId = tenantContext.requireTenantId()
    await TenantPolicy.assertTenantSettings(user, tenantId)

    const domain = await tenantDomainService.setPrimary(params.id, user.id)
    return response.ok({
      message: 'Primary domain updated',
      domain: tenantDomainService.serialize(domain),
    })
  }

  async destroy({ auth, params, response }: HttpContext) {
    const user = auth.user!
    const tenantId = tenantContext.requireTenantId()
    await TenantPolicy.assertTenantSettings(user, tenantId)

    await tenantDomainService.remove(params.id, user.id)
    return response.ok({ message: 'Domain removed' })
  }
}
